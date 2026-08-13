# Phase 42 — AWS Cost Controls and Two-Way SMS

**Region confirmed:** `us-east-1`

The deployment is an Amazon EKS cluster with EC2-backed managed worker nodes, plus an Amazon RDS PostgreSQL database. The region is confirmed by:

- `terraform/environments/dev/terraform.tfvars`
- `terraform/environments/dev/backend.tf`
- `terraform/bootstrap/remote-state/terraform.tfvars`
- the defaults in `scripts/deploy_aws_release.sh` and `scripts/sync_rds_db_secret.sh`

## Implemented behavior

Terraform provisions a cost-control Lambda, an SNS inbound topic, a Secrets Manager phone-configuration secret, and an EventBridge Scheduler schedule.

The daily schedule runs at **9:05 a.m. America/Toronto every day**, including weekends. EventBridge Scheduler applies Toronto daylight-saving changes automatically.

Each daily invocation:

1. Reconciles the last requested environment state.
2. Reads actual month-to-date account spend from AWS Cost Explorer.
3. Sends an SMS at $20, $30, $40, and $50. The $50 message is the final spend alert for the month.
4. Records the last alerted threshold in Systems Manager Parameter Store so the same threshold is not sent again.

Cost Explorer data is not real-time, so an alert is sent on the first daily check whose available month-to-date value has crossed a threshold.

## Environment controls

The accepted commands are:

- `DESTROY` or `STOP`: destroy the entire billable environment.
- `START` or `RESUME`: rebuild it and redeploy the application.
- `STATUS`: report by SMS whether the cluster and database exist.

### Why DESTROY is a full teardown

The original implementation only scaled worker node groups to zero and stopped
RDS. That removed the worker EC2 charge and nothing else. Measured on a full day
with the environment "shut down", the account still billed **$3.19/day**:

| Item | $/day | Removed by scaling workers to zero? |
| --- | --- | --- |
| EKS control plane | 2.30 | No — flat $0.10/hr while the cluster exists |
| Application Load Balancer | 0.52 | No — created by the in-cluster controller |
| Public IPv4 addresses | 0.23 | No — attached to the load balancer |
| RDS storage and backups | 0.07 | No — storage bills while stopped |
| Phone lease, Secrets Manager, Cost Explorer | 0.07 | No |

The EKS control plane alone was about 72% of the bill, and the load balancer and
its addresses were never tracked by Terraform, so they survived every shutdown.
Repeat `DESTROY` texts then returned success without changing anything, which
made the environment look like it kept restarting itself.

`DESTROY` now deletes the EKS cluster, node group, RDS instance, load balancer,
target groups, public IPv4 addresses, and unattached EBS volumes. It keeps the
VPC (free, no NAT gateway), the cost-control Lambda, the SMS wiring, and a final
RDS snapshot. Residual spend is roughly **$2/month**.

`START` restores the newest snapshot, so run history survives a teardown.

### How the commands execute

Terraform needs roughly 20 minutes and Lambda hard-caps at 15, so the Lambda does
not run Terraform. It records the requested state in Parameter Store and
dispatches the `provision-aws.yml` workflow through the GitHub API. The workflow
runs Terraform, redeploys the app, and texts the result.

The daily reconciliation still matters: AWS force-starts a stopped RDS instance
after seven days, and a failed workflow can leave the environment half-built. If
the requested state is `stopped` but any billable resource exists, the reconciler
re-dispatches the teardown and sends an SMS.

### One-time setup for DESTROY and START

1. Create a fine-grained GitHub personal access token scoped to this repository
   with **Actions: read and write**.
2. Store it in the Terraform-created secret:

   ```bash
   aws secretsmanager put-secret-value \
     --secret-id "$(terraform -chdir=terraform/environments/dev output -raw cost_control_github_token_secret_arn)" \
     --secret-string 'ghp_your_token_here' \
     --region us-east-1
   ```

3. Set the repository variable `AWS_GITHUB_ACTIONS_PROVISION_ROLE_ARN` to
   `terraform output -raw github_actions_provision_role_arn`.
4. `provision-aws.yml` must exist on the default branch, because
   `workflow_dispatch` only dispatches workflows from there.

The provisioning role holds `AdministratorAccess` because Terraform creates EKS,
RDS, VPC, and IAM resources. It is separate from the deploy role and is still
restricted by OIDC to the deploy branch of this repository.

### Custom domain caveat

The load balancer is created by the AWS Load Balancer Controller with a
generated name, so every rebuild produces a **new** hostname. The workflow texts
the new hostname; point the `app.minirtos.biz` CNAME at it after a `START`. The
ACM certificate is free and is kept across teardowns.

## Terraform deployment

From the dev environment:

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

Record these outputs:

```bash
terraform output -raw cost_control_lambda_name
terraform output -raw cost_control_sms_topic_arn
terraform output -raw cost_control_phone_secret_arn
terraform output -raw cost_control_daily_schedule_arn
```

Set the GitHub repository variable `COST_CONTROL_LAMBDA_NAME` to the first output. The existing GitHub OIDC deploy role is extended with permission to invoke only this Lambda.

The **Control AWS Environment** workflow then provides manual `status`, `status-sms`, `check-costs`, `start`, and `destroy` actions. State-changing actions require their action name as confirmation. `start` and `destroy` dispatch **Provision AWS Environment**, which is where the Terraform output appears.

`environment_enabled` has no default, so every `plan` and `apply` must state it. Use `-var environment_enabled=false` to change anything while the environment is torn down, and `true` only when you intend to rebuild it.

## AWS-native two-way SMS setup

Phone-number acquisition is intentionally separate from `terraform apply` because number type, availability, registration, approval, and monthly leasing cost vary. In AWS End User Messaging SMS in `us-east-1`:

1. Request an SMS-capable number for the destination country (Canada for a Toronto number).
2. Select transactional messaging and two-way messaging.
3. Wait until the number status is `ACTIVE`.
4. Run:

```bash
./scripts/configure_cost_control_sms.sh \
  +1YOUR_TORONTO_PHONE \
  phone-YOUR_AWS_PHONE_NUMBER_ID
```

The script:

- connects the AWS number's inbound messages to the Terraform SNS topic;
- enables deletion protection on the leased AWS number;
- stores the single authorized controller phone and origination ARN in Secrets Manager;
- leaves AWS-managed HELP/STOP opt-out behavior enabled;
- optionally sends a status test when `SEND_TEST_SMS=true`.

Only the exact authorized E.164 phone number can execute commands. Use `DESTROY`, rather than the carrier-reserved `STOP` keyword, for normal shutdown requests.

## Direct verification

Invoke without SMS:

```bash
LAMBDA_NAME="$(terraform -chdir=terraform/environments/dev output -raw cost_control_lambda_name)"

aws lambda invoke \
  --function-name "$LAMBDA_NAME" \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"status"}' \
  /tmp/minirtos-cost-status.json

jq . /tmp/minirtos-cost-status.json
```

After the number is active and configured, text `STATUS`, then test `DESTROY` and `START`. Both operations are asynchronous and can take several minutes to finish.

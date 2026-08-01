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

## Temporary environment controls

The accepted commands are:

- `DESTROY` or `STOP`: set every EKS managed node group's desired/minimum capacity to zero and temporarily stop RDS.
- `START` or `RESUME`: start RDS and restore EKS to the Terraform-configured full capacity, currently desired 2, minimum 1, maximum 2.
- `STATUS`: return the worker capacity and RDS state by SMS.

`DESTROY` does not call Terraform destroy and has no permission to delete EKS, RDS, VPC, storage, or any other infrastructure. The requested stopped state is saved in Parameter Store. The daily reconciliation is important because AWS automatically restarts an RDS instance after seven consecutive stopped days.

Scaling EKS workers to zero and stopping RDS does not reduce the AWS bill to literal zero. The EKS control plane, load balancer, RDS storage/backups, phone-number lease, and other retained resources can still incur charges.

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

The **Control AWS Environment** workflow then provides manual `status`, `status-sms`, `check-costs`, `start`, and `destroy` actions. State-changing actions require their action name as confirmation.

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

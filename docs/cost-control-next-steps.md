# Cost Control — Next Steps

Pick-up notes for finishing the DESTROY/START-by-text setup.

**Status as of 2026-08-19:** the AWS environment is fully torn down and holding at
**$0.077/day (~$2.35/month)**. Nothing below is urgent — the account is not
burning money. These steps only restore the ability to rebuild by text.

---

## Where things stand

| Item | State |
| --- | --- |
| EKS cluster, RDS, EC2, load balancers, Elastic IPs, EBS volumes | **All destroyed** (verified) |
| Database data | Preserved in snapshot `minirtos-dev-postgres-final-snapshot` |
| VPC, cost-control Lambda, SMS wiring, phone number | Kept (that's the ~$2/month) |
| PR #8 (the teardown/rebuild work) | **Open, not merged** |
| PR #7 (threshold change) | Open, unrelated, untouched |
| `AWS_GITHUB_ACTIONS_PROVISION_ROLE_ARN` repo variable | ✅ Set |
| GitHub token in Secrets Manager | ❌ **Not set** — blocks DESTROY/START |

Texting `STATUS` works right now. Texting `DESTROY` replies "already fully torn
down". Texting `START` will reply with a failure until the two steps below are done.

---

## Step 1 — Create the GitHub token

Cannot be automated; GitHub has no API for minting personal access tokens.

Go to **https://github.com/settings/personal-access-tokens/new**

- **Token name:** `minirtos-cost-control`
- **Repository access:** Only select repositories → `AmanAhmed2002/minirtos-linux`
- **Permissions** → Repository permissions → **Actions: Read and write**
  - This is the only permission needed. Leave everything else at "No access".
- **Expiration:** your call. 90 days is reasonable — when it lapses, texting
  START just replies with a clear failure rather than failing silently.

## Step 2 — Store the token

Run this yourself so the token never lands in a chat transcript:

```bash
aws secretsmanager put-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:058416978707:secret:minirtos-dev-cost-control-github-token-6Eeg15 \
  --secret-string 'github_pat_YOUR_TOKEN_HERE' \
  --region us-east-1
```

Verify it took:

```bash
aws secretsmanager describe-secret \
  --secret-id minirtos-dev-cost-control-github-token \
  --region us-east-1 --query 'VersionIdsToStages'
```

Should print a version map instead of `null`.

## Step 3 — Merge PR #8

```bash
gh pr merge 8 --squash
```

**This is required.** `workflow_dispatch` only dispatches workflows that exist on
the default branch, so `provision-aws.yml` must be on `main` before the Lambda
can trigger it.

## Step 4 — Verify the dispatch path

Confirms the Lambda can authenticate to GitHub without rebuilding anything.
A no-op teardown is safe: everything is already destroyed.

```bash
aws lambda invoke \
  --function-name minirtos-dev-cost-control \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"status"}' \
  /tmp/status.json --region us-east-1 && jq . /tmp/status.json
```

Then text `STATUS` to the control number and confirm you get a reply.

To test the real dispatch, text `START` — that rebuilds the environment (~20 min,
resumes normal spend). Only do this when you actually want it running.

---

## Using it day to day

| Text | Effect | Time |
| --- | --- | --- |
| `DESTROY` | Destroys EKS, workers, RDS, load balancer, public IPs, volumes. Keeps a final DB snapshot. | ~15 min |
| `START` | Rebuilds everything, restores the newest snapshot, redeploys the app. | ~20 min |
| `STATUS` | Reports whether the cluster and database exist. | instant |

Both DESTROY and START text you a confirmation when the workflow finishes.
Progress is visible under the **Provision AWS Environment** workflow in Actions.

### After every START — update DNS

The load balancer is created by the in-cluster controller with a generated name,
so **each rebuild produces a new hostname**. The completion text includes it.
Point the `app.minirtos.biz` CNAME at that hostname at your registrar, or the
site will not resolve. The ACM certificate is free and survives teardowns.

---

## Cost reference

What the environment costs when running, and why DESTROY now removes all of it:

| Item | $/day | Removed by the old "scale workers to zero"? |
| --- | --- | --- |
| EKS control plane | 2.30 | No — flat $0.10/hr, ~72% of the bill |
| Worker nodes (2 × t3.small) | 1.00 | Yes |
| Application Load Balancer | 0.52 | No |
| Public IPv4 addresses | 0.23 | No |
| RDS storage and backups | 0.07 | No |
| Phone lease, Secrets Manager, Cost Explorer | 0.07 | No |

Running: **~$4.19/day (~$127/month)**. Torn down: **~$0.077/day (~$2.35/month)**.

Spend alerts still fire by SMS at $20, $30, $40 and $50 month-to-date.

---

## Gotchas

- **`terraform apply` needs an explicit toggle.** `environment_enabled` has no
  default, on purpose. Use `-var environment_enabled=false` to change anything
  while torn down, `true` only when you mean to rebuild:
  ```bash
  cd terraform/environments/dev
  terraform apply -var environment_enabled=false
  ```
- **START needs container images.** It deploys the image built from the head of
  the deploy branch. If CI has not published images for that commit, START fails
  with a clear message. Push to `main` and let CI finish first.
- **The RDS seven-day restart is handled.** AWS force-starts a stopped instance
  after seven days. That no longer applies while fully destroyed, and the daily
  9:05 a.m. reconciler re-dispatches a teardown if anything billable reappears.
- **Snapshots accumulate.** Each teardown keeps a timestamped final snapshot.
  They are cheap (pennies) but worth pruning occasionally:
  ```bash
  aws rds describe-db-snapshots --snapshot-type manual --region us-east-1 \
    --query 'DBSnapshots[].{id:DBSnapshotIdentifier,created:SnapshotCreateTime}'
  ```
- **The provisioning role has AdministratorAccess.** Terraform creates EKS, RDS,
  VPC and IAM resources, which needs roughly that. It is separate from the deploy
  role and OIDC-restricted to the deploy branch of this repository.

---

## If something goes wrong

Check the workflow run first (Actions → Provision AWS Environment), then the
Lambda logs:

```bash
aws logs tail /aws/lambda/minirtos-dev-cost-control --since 1h --region us-east-1
```

To confirm nothing is quietly billing:

```bash
aws eks list-clusters --region us-east-1
aws rds describe-db-instances --region us-east-1 --query 'DBInstances[].DBInstanceIdentifier'
aws elbv2 describe-load-balancers --region us-east-1 --query 'LoadBalancers[].LoadBalancerName'
aws ec2 describe-addresses --region us-east-1 --query 'Addresses[].PublicIp'
aws ec2 describe-volumes --region us-east-1 --query 'Volumes[].VolumeId'
```

All five should come back empty while torn down.

Background on why the original setup kept charging is in
[phase42-aws-cost-controls.md](phase42-aws-cost-controls.md).

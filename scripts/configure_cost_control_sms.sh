#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/configure_cost_control_sms.sh <authorized-phone-e164> <aws-phone-number-id-or-arn>

Example:
  ./scripts/configure_cost_control_sms.sh +14165550123 phone-0123456789abcdef0

The AWS End User Messaging SMS number must already be ACTIVE and SMS-capable.
Request a Canadian two-way number in the AWS console before running this script.
Set SEND_TEST_SMS=true to send a STATUS message after configuration.
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $1"
    exit 1
  fi
}

if [[ $# -ne 2 ]]; then
  usage
  exit 1
fi

AUTHORIZED_PHONE="$1"
PHONE_NUMBER_ID="$2"
TF_DIR="${TF_DIR:-terraform/environments/dev}"

if ! [[ "$AUTHORIZED_PHONE" =~ ^\+[1-9][0-9]{7,18}$ ]]; then
  echo "ERROR: Authorized phone must use E.164 format, for example +14165550123."
  exit 1
fi

require_command aws
require_command jq
require_command terraform

tf_output() {
  terraform -chdir="$TF_DIR" output -raw "$1"
}

AWS_REGION="${AWS_REGION:-$(tf_output aws_region)}"
SMS_TOPIC_ARN="${COST_CONTROL_SMS_TOPIC_ARN:-$(tf_output cost_control_sms_topic_arn)}"
PHONE_SECRET_ARN="${COST_CONTROL_PHONE_SECRET_ARN:-$(tf_output cost_control_phone_secret_arn)}"
LAMBDA_NAME="${COST_CONTROL_LAMBDA_NAME:-$(tf_output cost_control_lambda_name)}"

PHONE_DETAILS="$(aws pinpoint-sms-voice-v2 describe-phone-numbers \
  --phone-number-ids "$PHONE_NUMBER_ID" \
  --region "$AWS_REGION" \
  --output json)"

PHONE_STATUS="$(jq -r '.PhoneNumbers[0].Status // empty' <<<"$PHONE_DETAILS")"
PHONE_ARN="$(jq -r '.PhoneNumbers[0].PhoneNumberArn // empty' <<<"$PHONE_DETAILS")"
AWS_PHONE_NUMBER="$(jq -r '.PhoneNumbers[0].PhoneNumber // empty' <<<"$PHONE_DETAILS")"

if [[ "$PHONE_STATUS" != "ACTIVE" || -z "$PHONE_ARN" || -z "$AWS_PHONE_NUMBER" ]]; then
  echo "ERROR: The AWS phone number must exist and have ACTIVE status."
  exit 1
fi

aws pinpoint-sms-voice-v2 update-phone-number \
  --phone-number-id "$PHONE_NUMBER_ID" \
  --two-way-enabled \
  --two-way-channel-arn "$SMS_TOPIC_ARN" \
  --deletion-protection-enabled \
  --region "$AWS_REGION" \
  >/dev/null

PHONE_CONFIG="$(jq -nc \
  --arg authorized_phone_number "$AUTHORIZED_PHONE" \
  --arg origination_identity "$PHONE_ARN" \
  '{authorized_phone_number: $authorized_phone_number, origination_identity: $origination_identity}')"

aws secretsmanager put-secret-value \
  --secret-id "$PHONE_SECRET_ARN" \
  --secret-string "$PHONE_CONFIG" \
  --region "$AWS_REGION" \
  >/dev/null

echo "Configured two-way SMS on $AWS_PHONE_NUMBER."
echo "Authorized one controller phone and enabled deletion protection on the AWS number."
echo "Text STATUS, DESTROY, or START to $AWS_PHONE_NUMBER after carrier routing is ready."

if [[ "${SEND_TEST_SMS:-false}" == "true" ]]; then
  aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --cli-binary-format raw-in-base64-out \
    --payload '{"action":"status-sms","source":"sms-setup"}' \
    --region "$AWS_REGION" \
    /tmp/minirtos-cost-control-test.json \
    >/dev/null
  jq . /tmp/minirtos-cost-control-test.json
fi

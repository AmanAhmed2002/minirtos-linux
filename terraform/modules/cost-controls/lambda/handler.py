import hmac
import json
import logging
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3
from botocore.exceptions import ClientError


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

REGION = os.environ["AWS_CONTROL_REGION"]
CLUSTER_NAME = os.environ["EKS_CLUSTER_NAME"]
RDS_INSTANCE_IDENTIFIER = os.environ["RDS_INSTANCE_IDENTIFIER"]
POWER_STATE_PARAMETER = os.environ["POWER_STATE_PARAMETER"]
COST_STATE_PARAMETER = os.environ["COST_STATE_PARAMETER"]
PHONE_CONFIG_SECRET_ARN = os.environ["PHONE_CONFIG_SECRET_ARN"]

DEFAULT_CAPACITY = {
    "desiredSize": int(os.environ["DEFAULT_NODE_DESIRED_COUNT"]),
    "minSize": int(os.environ["DEFAULT_NODE_MIN_COUNT"]),
    "maxSize": int(os.environ["DEFAULT_NODE_MAX_COUNT"]),
}
COST_ALERT_START = Decimal(os.environ.get("COST_ALERT_START_USD", "20"))
COST_ALERT_INCREMENT = Decimal(os.environ.get("COST_ALERT_INCREMENT_USD", "10"))
COST_ALERT_MAX = Decimal(os.environ.get("COST_ALERT_MAX_USD", "50"))
SMS_MAX_PRICE = os.environ.get("SMS_MAX_PRICE_USD", "0.50")
LOCAL_TIME_ZONE = ZoneInfo(os.environ.get("LOCAL_TIME_ZONE", "America/Toronto"))

# A full teardown and rebuild runs terraform, which takes roughly 20 minutes and
# cannot fit in a Lambda. The Lambda only dispatches the workflow that does it.
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "")
GITHUB_REF = os.environ.get("GITHUB_REF", "main")
PROVISION_WORKFLOW = os.environ.get("PROVISION_WORKFLOW", "provision-aws.yml")
GITHUB_TOKEN_SECRET_ARN = os.environ.get("GITHUB_TOKEN_SECRET_ARN", "")

EKS = boto3.client("eks", region_name=REGION)
RDS = boto3.client("rds", region_name=REGION)
SSM = boto3.client("ssm", region_name=REGION)
SECRETS = boto3.client("secretsmanager", region_name=REGION)
SMS = boto3.client("pinpoint-sms-voice-v2", region_name=REGION)
CE = boto3.client("ce", region_name="us-east-1")


def _get_json_parameter(name):
    try:
        response = SSM.get_parameter(Name=name)
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") == "ParameterNotFound":
            return None
        raise
    return json.loads(response["Parameter"]["Value"])


def _put_json_parameter(name, value):
    SSM.put_parameter(
        Name=name,
        Type="String",
        Value=json.dumps(value, separators=(",", ":"), sort_keys=True),
        Overwrite=True,
    )


def _is_missing(error, *codes):
    code = error.response.get("Error", {}).get("Code")
    return code in codes


def cluster_exists():
    try:
        EKS.describe_cluster(name=CLUSTER_NAME)
    except ClientError as error:
        if _is_missing(error, "ResourceNotFoundException"):
            return False
        raise
    return True


def _list_node_groups():
    names = []
    token = None
    while True:
        request = {"clusterName": CLUSTER_NAME}
        if token:
            request["nextToken"] = token
        try:
            response = EKS.list_nodegroups(**request)
        except ClientError as error:
            if _is_missing(error, "ResourceNotFoundException"):
                return names
            raise
        names.extend(response.get("nodegroups", []))
        token = response.get("nextToken")
        if not token:
            return names


def _node_group_states():
    states = {}
    for name in _list_node_groups():
        node_group = EKS.describe_nodegroup(
            clusterName=CLUSTER_NAME,
            nodegroupName=name,
        )["nodegroup"]
        scaling = node_group["scalingConfig"]
        states[name] = {
            "status": node_group["status"],
            "desiredSize": int(scaling["desiredSize"]),
            "minSize": int(scaling["minSize"]),
            "maxSize": int(scaling["maxSize"]),
        }
    return states


def _rds_status():
    """Current DB status, or "absent" when the instance has been torn down."""
    try:
        response = RDS.describe_db_instances(
            DBInstanceIdentifier=RDS_INSTANCE_IDENTIFIER,
        )
    except ClientError as error:
        if _is_missing(error, "DBInstanceNotFound", "DBInstanceNotFoundFault"):
            return "absent"
        raise
    return response["DBInstances"][0]["DBInstanceStatus"]


def power_status():
    requested = _get_json_parameter(POWER_STATE_PARAMETER) or {}
    exists = cluster_exists()
    return {
        "cluster": CLUSTER_NAME,
        "cluster_exists": exists,
        "node_groups": _node_group_states() if exists else {},
        "requested_state": requested.get("desired_state", "running"),
        "rds_instance": RDS_INSTANCE_IDENTIFIER,
        "rds_status": _rds_status(),
    }


def _configured_power_state(node_group_names, desired_state):
    return {
        "desired_state": desired_state,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "node_groups": {
            name: dict(DEFAULT_CAPACITY) for name in node_group_names
        },
    }


def _github_token():
    if not GITHUB_TOKEN_SECRET_ARN:
        raise ValueError(
            "GITHUB_TOKEN_SECRET_ARN is not configured, so the provisioning "
            "workflow cannot be dispatched."
        )
    secret = SECRETS.get_secret_value(SecretId=GITHUB_TOKEN_SECRET_ARN)["SecretString"]
    # Accept either a bare token or a JSON object holding one, so populating the
    # secret by hand is hard to get wrong.
    try:
        parsed = json.loads(secret)
    except json.JSONDecodeError:
        return secret.strip()
    if isinstance(parsed, dict):
        for key in ("token", "github_token", "value"):
            if parsed.get(key):
                return str(parsed[key]).strip()
        raise ValueError("GitHub token secret JSON must contain a token field")
    return str(parsed).strip()


def dispatch_provision_workflow(action):
    """Ask GitHub Actions to run terraform for a full teardown or rebuild."""
    if not GITHUB_REPOSITORY:
        raise ValueError("GITHUB_REPOSITORY is not configured")

    url = (
        f"https://api.github.com/repos/{GITHUB_REPOSITORY}"
        f"/actions/workflows/{PROVISION_WORKFLOW}/dispatches"
    )
    body = json.dumps(
        {
            "ref": GITHUB_REF,
            "inputs": {"action": action, "confirm": action},
        }
    ).encode()

    request = urllib.request.Request(url, data=body, method="POST")
    request.add_header("Authorization", f"Bearer {_github_token()}")
    request.add_header("Accept", "application/vnd.github+json")
    request.add_header("X-GitHub-Api-Version", "2022-11-28")
    request.add_header("Content-Type", "application/json")
    request.add_header("User-Agent", "minirtos-cost-control")

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status = response.status
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", "replace")[:400]
        raise RuntimeError(
            f"GitHub workflow dispatch failed with {error.code}: {detail}"
        ) from error

    LOGGER.info("Dispatched %s workflow for action %s", PROVISION_WORKFLOW, action)
    return {"workflow": PROVISION_WORKFLOW, "ref": GITHUB_REF, "status": status}


def stop_environment():
    """Tear the billable environment down completely.

    Scaling workers to zero was never enough: the EKS control plane, the load
    balancer, and its public IPv4 addresses kept billing regardless. The
    provisioning workflow destroys all of it and keeps a final RDS snapshot.
    """
    _put_json_parameter(
        POWER_STATE_PARAMETER,
        _configured_power_state(_list_node_groups(), "stopped"),
    )

    dispatch = dispatch_provision_workflow("destroy")

    return {
        "ok": True,
        "action": "destroy",
        "requested_state": "stopped",
        "mode": "full-teardown",
        "dispatch": dispatch,
    }


def start_environment():
    """Rebuild the environment from scratch, restoring the newest DB snapshot."""
    _put_json_parameter(
        POWER_STATE_PARAMETER,
        _configured_power_state(_list_node_groups(), "running"),
    )

    dispatch = dispatch_provision_workflow("start")

    return {
        "ok": True,
        "action": "start",
        "requested_state": "running",
        "mode": "full-rebuild",
        "restored_capacity": dict(DEFAULT_CAPACITY),
        "dispatch": dispatch,
    }


def reconcile_requested_state():
    """Re-assert a requested teardown if anything billable came back.

    RDS force-starts itself after seven stopped days and a failed workflow can
    leave the cluster half-built, so a stopped environment that still has
    infrastructure is torn down again.
    """
    state = _get_json_parameter(POWER_STATE_PARAMETER) or {}
    requested = state.get("desired_state", "running")

    if requested != "stopped":
        return {
            "ok": True,
            "action": "reconcile",
            "requested_state": requested,
            "result": "no-shutdown-requested",
        }

    database_status = _rds_status()
    leftovers = cluster_exists() or database_status != "absent"
    if not leftovers:
        return {
            "ok": True,
            "action": "reconcile",
            "requested_state": "stopped",
            "result": "already-torn-down",
        }

    LOGGER.warning(
        "Environment is meant to be torn down but cluster_exists=%s rds_status=%s; "
        "re-dispatching teardown",
        cluster_exists(),
        database_status,
    )
    dispatch = dispatch_provision_workflow("destroy")
    send_sms(
        "MiniRTOS found billable infrastructure that should be torn down "
        "(likely the RDS seven-day auto-restart). Teardown restarted."
    )
    return {
        "ok": True,
        "action": "reconcile",
        "requested_state": "stopped",
        "result": "teardown-redispatched",
        "rds_status": database_status,
        "dispatch": dispatch,
    }


def _phone_configuration():
    response = SECRETS.get_secret_value(SecretId=PHONE_CONFIG_SECRET_ARN)
    configuration = json.loads(response["SecretString"])
    required = {"authorized_phone_number", "origination_identity"}
    if not required.issubset(configuration):
        raise ValueError(
            "Phone configuration must contain authorized_phone_number and origination_identity"
        )
    return configuration


def _normalize_phone_number(value):
    value = re.sub(r"[\s().-]", "", value or "")
    if not re.fullmatch(r"\+[1-9][0-9]{7,18}", value):
        raise ValueError("Phone numbers must use E.164 format, for example +14165550123")
    return value


def send_sms(message):
    configuration = _phone_configuration()
    destination = _normalize_phone_number(
        configuration["authorized_phone_number"]
    )
    response = SMS.send_text_message(
        DestinationPhoneNumber=destination,
        OriginationIdentity=configuration["origination_identity"],
        MessageBody=message,
        MessageType="TRANSACTIONAL",
        MaxPrice=SMS_MAX_PRICE,
    )
    return response["MessageId"]


def _status_message(status):
    if not status["cluster_exists"] and status["rds_status"] == "absent":
        return (
            "MiniRTOS is fully torn down. No EKS cluster, no database, no load "
            f"balancer. Requested state: {status['requested_state']}. "
            "Reply START to rebuild (~20 min)."
        )

    node_parts = []
    for name, state in status["node_groups"].items():
        node_parts.append(
            f"{name} desired={state['desiredSize']} min={state['minSize']} max={state['maxSize']}"
        )
    nodes = "; ".join(node_parts) or "no managed node groups"
    cluster = "present" if status["cluster_exists"] else "absent"
    return (
        f"MiniRTOS: cluster={cluster}; {nodes}; RDS={status['rds_status']}; "
        f"requested={status['requested_state']}. Commands: DESTROY, START, STATUS."
    )


def handle_inbound_sms(payload):
    sender = _normalize_phone_number(payload.get("originationNumber"))
    configuration = _phone_configuration()
    authorized = _normalize_phone_number(
        configuration["authorized_phone_number"]
    )

    if not hmac.compare_digest(sender, authorized):
        LOGGER.warning("Ignored an SMS command from an unauthorized phone number")
        return {"ok": False, "ignored": "unauthorized-sender"}

    command = payload.get("messageBody", "").strip().lower()
    if command in {"destroy", "stop"}:
        status = power_status()
        if not status["cluster_exists"] and status["rds_status"] == "absent":
            # Silently succeeding here is what made repeat DESTROY texts look
            # like the environment kept coming back.
            _put_json_parameter(
                POWER_STATE_PARAMETER,
                _configured_power_state([], "stopped"),
            )
            send_sms(
                "MiniRTOS is already fully torn down; nothing to destroy. "
                "Remaining spend is the leased phone number and Secrets Manager, "
                "about $2/month. Reply START to rebuild."
            )
            return {"ok": True, "action": "destroy", "result": "already-torn-down"}

        try:
            result = stop_environment()
        except Exception as error:
            LOGGER.exception("Teardown dispatch failed")
            send_sms(
                "MiniRTOS teardown could NOT be started: "
                f"{type(error).__name__}. Nothing was changed and the "
                "environment is still billing. Check the cost-control Lambda logs."
            )
            return {"ok": False, "action": "destroy", "error": str(error)}

        send_sms(
            "MiniRTOS full teardown started: EKS cluster, workers, load balancer, "
            "public IPs and RDS are being destroyed. A final database snapshot is "
            "kept. Takes about 15 min; you will get a confirmation. Reply START to rebuild."
        )
        return result
    if command in {"start", "resume"}:
        status = power_status()
        if status["cluster_exists"] and status["rds_status"] not in {"absent", "stopped"}:
            send_sms(
                f"MiniRTOS is already running (RDS={status['rds_status']}). "
                "Reply STATUS for detail."
            )
            return {"ok": True, "action": "start", "result": "already-running"}

        try:
            result = start_environment()
        except Exception as error:
            LOGGER.exception("Rebuild dispatch failed")
            send_sms(
                "MiniRTOS rebuild could NOT be started: "
                f"{type(error).__name__}. Check the cost-control Lambda logs."
            )
            return {"ok": False, "action": "start", "error": str(error)}

        send_sms(
            "MiniRTOS rebuild started: creating the EKS cluster, workers and "
            "database from the latest snapshot, then deploying the app. Takes "
            "about 20 min. You will get the new app URL when it finishes."
        )
        return result
    if command == "status":
        status = power_status()
        send_sms(_status_message(status))
        return {"ok": True, "action": "status", **status}

    send_sms(
        "Unknown command. Reply DESTROY to tear everything down, START to "
        "rebuild it, or STATUS to check."
    )
    return {"ok": False, "ignored": "unknown-command"}


def _month_to_date_cost(today):
    month_start = today.replace(day=1)
    response = CE.get_cost_and_usage(
        TimePeriod={
            "Start": month_start.isoformat(),
            "End": (today + timedelta(days=1)).isoformat(),
        },
        Granularity="MONTHLY",
        Metrics=["UnblendedCost"],
    )
    results = response.get("ResultsByTime", [])
    if not results:
        return Decimal("0")
    return Decimal(results[0]["Total"]["UnblendedCost"]["Amount"])


def check_costs(today=None):
    today = today or datetime.now(LOCAL_TIME_ZONE).date()
    month = today.strftime("%Y-%m")
    actual = _month_to_date_cost(today)
    state = _get_json_parameter(COST_STATE_PARAMETER) or {}

    configured_thresholds = []
    threshold = COST_ALERT_START
    while threshold <= COST_ALERT_MAX:
        configured_thresholds.append(threshold)
        threshold += COST_ALERT_INCREMENT

    initial_threshold = COST_ALERT_START - COST_ALERT_INCREMENT
    if state.get("month") == month:
        last_threshold = Decimal(
            str(state.get("last_alert_threshold", initial_threshold))
        )
        # Reset a sentinel left by an older threshold configuration. This lets a
        # mid-month rollout start using the new sequence without editing state.
        if last_threshold not in configured_thresholds:
            last_threshold = initial_threshold
    else:
        last_threshold = initial_threshold

    crossed = [
        threshold
        for threshold in configured_thresholds
        if last_threshold < threshold <= actual
    ]

    message_ids = []
    for crossed_threshold in crossed:
        message_ids.append(
            send_sms(
                f"AWS month-to-date spend is ${actual:.2f}; crossed ${crossed_threshold:.0f}. "
                "Reply DESTROY to temporarily stop MiniRTOS EKS workers and RDS, or STATUS to inspect it."
            )
        )
        last_threshold = crossed_threshold

    _put_json_parameter(
        COST_STATE_PARAMETER,
        {
            "month": month,
            "last_alert_threshold": str(last_threshold),
            "last_observed_cost": str(actual),
            "checked_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    return {
        "ok": True,
        "action": "check-costs",
        "month": month,
        "actual_usd": str(actual),
        "alerted_thresholds": [str(value) for value in crossed],
        "message_ids": message_ids,
    }


def daily_maintenance():
    results = {}
    errors = {}

    for name, operation in (
        ("shutdown_reconciliation", reconcile_requested_state),
        ("cost_check", check_costs),
    ):
        try:
            results[name] = operation()
        except Exception as error:  # Continue so one check cannot suppress the other.
            LOGGER.exception("Daily %s failed", name)
            errors[name] = f"{type(error).__name__}: {error}"

    if errors:
        raise RuntimeError(
            json.dumps(
                {"message": "Daily maintenance failed", "errors": errors},
                separators=(",", ":"),
                sort_keys=True,
            )
        )

    return {"ok": True, "action": "daily-maintenance", **results}


def _sns_payloads(event):
    payloads = []
    for record in event.get("Records", []):
        if record.get("EventSource") != "aws:sns":
            continue
        message = record.get("Sns", {}).get("Message", "{}")
        payloads.append(json.loads(message) if isinstance(message, str) else message)
    return payloads


def lambda_handler(event, _context):
    payloads = _sns_payloads(event)
    if payloads:
        return {
            "ok": True,
            "action": "inbound-sms",
            "results": [handle_inbound_sms(payload) for payload in payloads],
        }

    action = str(event.get("action", "status")).strip().lower()
    LOGGER.info("Processing cost-control action: %s", action)
    if action in {"destroy", "stop"}:
        return stop_environment()
    if action in {"start", "resume"}:
        return start_environment()
    if action == "status":
        return {"ok": True, "action": "status", **power_status()}
    if action in {"status-sms", "status_sms"}:
        status = power_status()
        return {
            "ok": True,
            "action": "status-sms",
            "message_id": send_sms(_status_message(status)),
            **status,
        }
    if action in {"check-costs", "check_costs"}:
        return check_costs()
    if action == "notify":
        # Used by the provisioning workflow to report teardown/rebuild results.
        message = str(event.get("message", "")).strip()
        if not message:
            raise ValueError("notify requires a message")
        return {
            "ok": True,
            "action": "notify",
            "message_id": send_sms(message[:1400]),
        }
    if action in {"reconcile", "reconcile-state"}:
        return reconcile_requested_state()
    if action in {"daily-maintenance", "daily_maintenance"}:
        return daily_maintenance()
    raise ValueError(f"Unsupported action: {action}")

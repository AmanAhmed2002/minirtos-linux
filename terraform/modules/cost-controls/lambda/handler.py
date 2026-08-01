import hmac
import json
import logging
import os
import re
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


def _list_node_groups():
    names = []
    token = None
    while True:
        request = {"clusterName": CLUSTER_NAME}
        if token:
            request["nextToken"] = token
        response = EKS.list_nodegroups(**request)
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
    response = RDS.describe_db_instances(
        DBInstanceIdentifier=RDS_INSTANCE_IDENTIFIER,
    )
    return response["DBInstances"][0]["DBInstanceStatus"]


def power_status():
    requested = _get_json_parameter(POWER_STATE_PARAMETER) or {}
    return {
        "cluster": CLUSTER_NAME,
        "node_groups": _node_group_states(),
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


def stop_environment():
    current = _node_group_states()

    # Record the requested state before making API calls so the daily reconciler
    # can finish a partial shutdown and re-stop RDS after its seven-day restart.
    _put_json_parameter(
        POWER_STATE_PARAMETER,
        _configured_power_state(current.keys(), "stopped"),
    )

    node_updates = {}
    for name, state in current.items():
        if state["desiredSize"] == 0 and state["minSize"] == 0:
            node_updates[name] = "already-stopped"
            continue
        response = EKS.update_nodegroup_config(
            clusterName=CLUSTER_NAME,
            nodegroupName=name,
            scalingConfig={
                "desiredSize": 0,
                "minSize": 0,
                "maxSize": state["maxSize"],
            },
        )
        node_updates[name] = response["update"]["id"]

    database_status = _rds_status()
    if database_status == "available":
        RDS.stop_db_instance(DBInstanceIdentifier=RDS_INSTANCE_IDENTIFIER)
        database_action = "stop-requested"
    elif database_status in {"stopped", "stopping"}:
        database_action = "already-stopped"
    else:
        database_action = f"not-stopped-while-{database_status}"

    return {
        "ok": True,
        "action": "stop",
        "temporary": True,
        "requested_state": "stopped",
        "node_group_updates": node_updates,
        "rds_action": database_action,
    }


def start_environment():
    current = _node_group_states()

    # START always restores the Terraform-configured full capacity (2/1/2 by
    # default), even if capacity happened to be lower before DESTROY.
    _put_json_parameter(
        POWER_STATE_PARAMETER,
        _configured_power_state(current.keys(), "running"),
    )

    database_status = _rds_status()
    if database_status == "stopped":
        RDS.start_db_instance(DBInstanceIdentifier=RDS_INSTANCE_IDENTIFIER)
        database_action = "start-requested"
    elif database_status in {"available", "starting"}:
        database_action = "already-started"
    else:
        database_action = f"not-started-while-{database_status}"

    node_updates = {}
    for name, state in current.items():
        capacity = dict(DEFAULT_CAPACITY)
        if all(state[key] == capacity[key] for key in capacity):
            node_updates[name] = "already-restored"
            continue
        response = EKS.update_nodegroup_config(
            clusterName=CLUSTER_NAME,
            nodegroupName=name,
            scalingConfig=capacity,
        )
        node_updates[name] = response["update"]["id"]

    return {
        "ok": True,
        "action": "start",
        "requested_state": "running",
        "restored_capacity": dict(DEFAULT_CAPACITY),
        "node_group_updates": node_updates,
        "rds_action": database_action,
    }


def reconcile_requested_state():
    state = _get_json_parameter(POWER_STATE_PARAMETER) or {}
    if state.get("desired_state") == "stopped":
        return stop_environment()
    return {
        "ok": True,
        "action": "reconcile",
        "requested_state": state.get("desired_state", "running"),
        "result": "no-shutdown-requested",
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
    node_parts = []
    for name, state in status["node_groups"].items():
        node_parts.append(
            f"{name} desired={state['desiredSize']} min={state['minSize']} max={state['maxSize']}"
        )
    nodes = "; ".join(node_parts) or "no managed node groups"
    return f"MiniRTOS: {nodes}; RDS={status['rds_status']}. Commands: DESTROY, START, STATUS."


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
        result = stop_environment()
        send_sms(
            "MiniRTOS temporary shutdown requested: EKS workers are scaling to zero and RDS is stopping. Reply START to restore."
        )
        return result
    if command in {"start", "resume"}:
        result = start_environment()
        send_sms(
            "MiniRTOS restart requested: RDS and the saved EKS worker capacity are restoring. Startup takes several minutes."
        )
        return result
    if command == "status":
        status = power_status()
        send_sms(_status_message(status))
        return {"ok": True, "action": "status", **status}

    send_sms("Unknown command. Reply DESTROY, START, or STATUS.")
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
    if action in {"reconcile", "reconcile-state"}:
        return reconcile_requested_state()
    if action in {"daily-maintenance", "daily_maintenance"}:
        return daily_maintenance()
    raise ValueError(f"Unsupported action: {action}")

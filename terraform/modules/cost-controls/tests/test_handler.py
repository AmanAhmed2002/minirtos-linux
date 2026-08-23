import importlib.util
import json
import os
import sys
import types
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock, patch


ENVIRONMENT = {
    "AWS_CONTROL_REGION": "us-east-1",
    "EKS_CLUSTER_NAME": "minirtos-eks",
    "RDS_INSTANCE_IDENTIFIER": "minirtos-dev-postgres",
    "POWER_STATE_PARAMETER": "/minirtos/dev/cost-control/power-state",
    "COST_STATE_PARAMETER": "/minirtos/dev/cost-control/cost-alert-state",
    "PHONE_CONFIG_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:test",
    "DEFAULT_NODE_DESIRED_COUNT": "2",
    "DEFAULT_NODE_MIN_COUNT": "1",
    "DEFAULT_NODE_MAX_COUNT": "2",
    "COST_ALERT_START_USD": "20",
    "COST_ALERT_INCREMENT_USD": "10",
    "COST_ALERT_MAX_USD": "50",
    "LOCAL_TIME_ZONE": "America/Toronto",
    "GITHUB_REPOSITORY": "AmanAhmed2002/minirtos-linux",
    "GITHUB_REF": "main",
    "PROVISION_WORKFLOW": "provision-aws.yml",
    "GITHUB_TOKEN_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:123456789012:secret:gh",
}


class FakeClientError(Exception):
    def __init__(self, response, operation_name):
        super().__init__(operation_name)
        self.response = response


def load_handler():
    clients = {}

    def client(name, **_kwargs):
        clients.setdefault(name, MagicMock(name=name))
        return clients[name]

    boto3 = types.ModuleType("boto3")
    boto3.client = client
    botocore = types.ModuleType("botocore")
    exceptions = types.ModuleType("botocore.exceptions")
    exceptions.ClientError = FakeClientError

    module_path = Path(__file__).parents[1] / "lambda" / "handler.py"
    spec = importlib.util.spec_from_file_location("cost_control_handler", module_path)
    module = importlib.util.module_from_spec(spec)

    with patch.dict(os.environ, ENVIRONMENT, clear=False), patch.dict(
        sys.modules,
        {
            "boto3": boto3,
            "botocore": botocore,
            "botocore.exceptions": exceptions,
        },
    ):
        spec.loader.exec_module(module)

    return module, clients


class CostControlHandlerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.handler, cls.clients = load_handler()

    def setUp(self):
        for client in self.clients.values():
            client.reset_mock()

    def test_start_dispatches_a_full_rebuild(self):
        with patch.object(
            self.handler, "_list_node_groups", return_value=[]
        ), patch.object(
            self.handler, "_put_json_parameter"
        ) as put_state, patch.object(
            self.handler, "dispatch_provision_workflow", return_value={"status": 204}
        ) as dispatch:
            result = self.handler.start_environment()

        dispatch.assert_called_once_with("start")
        self.assertEqual(result["mode"], "full-rebuild")
        self.assertEqual(put_state.call_args.args[1]["desired_state"], "running")

    def test_destroy_dispatches_a_full_teardown(self):
        """Scaling workers to zero left the control plane and ALB billing."""
        with patch.object(
            self.handler, "_list_node_groups", return_value=["minirtos-nodes"]
        ), patch.object(
            self.handler, "_put_json_parameter"
        ) as put_state, patch.object(
            self.handler, "dispatch_provision_workflow", return_value={"status": 204}
        ) as dispatch:
            result = self.handler.stop_environment()

        dispatch.assert_called_once_with("destroy")
        self.assertEqual(result["mode"], "full-teardown")
        self.assertEqual(put_state.call_args.args[1]["desired_state"], "stopped")
        # The teardown must not fall back to merely resizing the node group.
        self.handler.EKS.update_nodegroup_config.assert_not_called()

    def test_repeat_destroy_reports_already_torn_down_instead_of_succeeding_silently(self):
        payload = {"originationNumber": "+14165550123", "messageBody": "DESTROY"}
        with patch.object(
            self.handler,
            "_phone_configuration",
            return_value={
                "authorized_phone_number": "+14165550123",
                "origination_identity": "phone-1",
            },
        ), patch.object(
            self.handler,
            "power_status",
            return_value={"cluster_exists": False, "rds_status": "absent"},
        ), patch.object(
            self.handler, "_put_json_parameter"
        ), patch.object(
            self.handler, "dispatch_provision_workflow"
        ) as dispatch, patch.object(
            self.handler, "send_sms", return_value="m1"
        ) as send:
            result = self.handler.handle_inbound_sms(payload)

        self.assertEqual(result["result"], "already-torn-down")
        dispatch.assert_not_called()
        self.assertIn("already fully torn down", send.call_args.args[0])

    def test_status_reports_a_torn_down_environment(self):
        with patch.object(
            self.handler,
            "_get_json_parameter",
            return_value={"desired_state": "stopped"},
        ), patch.object(
            self.handler, "cluster_exists", return_value=False
        ), patch.object(
            self.handler, "_rds_status", return_value="absent"
        ):
            result = self.handler.power_status()

        self.assertEqual(result["requested_state"], "stopped")
        self.assertFalse(result["cluster_exists"])
        self.assertIn("fully torn down", self.handler._status_message(result))

    def test_reconcile_is_quiet_once_everything_is_gone(self):
        with patch.object(
            self.handler,
            "_get_json_parameter",
            return_value={"desired_state": "stopped"},
        ), patch.object(
            self.handler, "cluster_exists", return_value=False
        ), patch.object(
            self.handler, "_rds_status", return_value="absent"
        ), patch.object(
            self.handler, "dispatch_provision_workflow"
        ) as dispatch:
            result = self.handler.reconcile_requested_state()

        self.assertEqual(result["result"], "already-torn-down")
        dispatch.assert_not_called()

    def test_reconcile_redispatches_teardown_after_the_rds_seven_day_restart(self):
        """RDS force-starts itself after seven stopped days."""
        with patch.object(
            self.handler,
            "_get_json_parameter",
            return_value={"desired_state": "stopped"},
        ), patch.object(
            self.handler, "cluster_exists", return_value=False
        ), patch.object(
            self.handler, "_rds_status", return_value="available"
        ), patch.object(
            self.handler, "dispatch_provision_workflow", return_value={"status": 204}
        ) as dispatch, patch.object(
            self.handler, "send_sms", return_value="m1"
        ):
            result = self.handler.reconcile_requested_state()

        self.assertEqual(result["result"], "teardown-redispatched")
        dispatch.assert_called_once_with("destroy")

    def test_cost_alerts_run_from_20_through_50_only(self):
        with patch.object(
            self.handler, "_month_to_date_cost", return_value=self.handler.Decimal("101")
        ), patch.object(
            self.handler, "_get_json_parameter", return_value=None
        ), patch.object(
            self.handler, "_put_json_parameter"
        ) as put_state, patch.object(
            self.handler, "send_sms", side_effect=["m1", "m2", "m3", "m4"]
        ) as send:
            result = self.handler.check_costs(date(2026, 7, 18))

        self.assertEqual(result["alerted_thresholds"], ["20", "30", "40", "50"])
        self.assertEqual(send.call_count, 4)
        saved = put_state.call_args.args[1]
        self.assertEqual(saved["month"], "2026-07")
        self.assertEqual(saved["last_alert_threshold"], "50")

    def test_new_thresholds_replace_legacy_unalerted_sentinel(self):
        legacy_state = {
            "month": "2026-08",
            "last_alert_threshold": "25",
        }
        with patch.object(
            self.handler, "_month_to_date_cost", return_value=self.handler.Decimal("20")
        ), patch.object(
            self.handler, "_get_json_parameter", return_value=legacy_state
        ), patch.object(
            self.handler, "_put_json_parameter"
        ), patch.object(
            self.handler, "send_sms", return_value="m1"
        ) as send:
            result = self.handler.check_costs(date(2026, 8, 1))

        self.assertEqual(result["alerted_thresholds"], ["20"])
        send.assert_called_once()

    def test_dispatch_posts_the_action_to_the_github_workflow(self):
        captured = {}

        class FakeResponse:
            status = 204

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

        def fake_urlopen(request, timeout=None):
            captured["url"] = request.full_url
            captured["body"] = json.loads(request.data.decode())
            captured["auth"] = request.get_header("Authorization")
            return FakeResponse()

        with patch.object(
            self.handler, "_github_token", return_value="ghp_example"
        ), patch.object(self.handler.urllib.request, "urlopen", fake_urlopen):
            result = self.handler.dispatch_provision_workflow("destroy")

        self.assertEqual(result["status"], 204)
        self.assertIn(
            "/repos/AmanAhmed2002/minirtos-linux/actions/workflows/"
            "provision-aws.yml/dispatches",
            captured["url"],
        )
        self.assertEqual(captured["body"]["ref"], "main")
        self.assertEqual(captured["body"]["inputs"]["action"], "destroy")
        self.assertEqual(captured["body"]["inputs"]["confirm"], "destroy")
        self.assertEqual(captured["auth"], "Bearer ghp_example")

    def test_github_token_accepts_a_bare_string_or_json(self):
        self.handler.SECRETS.get_secret_value.return_value = {
            "SecretString": "ghp_bare"
        }
        self.assertEqual(self.handler._github_token(), "ghp_bare")

        self.handler.SECRETS.get_secret_value.return_value = {
            "SecretString": json.dumps({"token": "ghp_json"})
        }
        self.assertEqual(self.handler._github_token(), "ghp_json")

    def test_daily_maintenance_attempts_both_operations(self):
        with patch.object(
            self.handler,
            "reconcile_requested_state",
            side_effect=RuntimeError("reconcile failed"),
        ) as reconcile, patch.object(
            self.handler,
            "check_costs",
            return_value={"ok": True, "action": "check-costs"},
        ) as costs:
            with self.assertLogs(self.handler.LOGGER, level="ERROR"):
                with self.assertRaisesRegex(RuntimeError, "Daily maintenance failed"):
                    self.handler.daily_maintenance()

        reconcile.assert_called_once()
        costs.assert_called_once()


if __name__ == "__main__":
    unittest.main()

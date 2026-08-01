import importlib.util
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

    def test_start_restores_configured_full_capacity(self):
        current = {
            "minirtos-nodes": {
                "status": "ACTIVE",
                "desiredSize": 0,
                "minSize": 0,
                "maxSize": 2,
            }
        }
        self.handler.EKS.update_nodegroup_config.return_value = {
            "update": {"id": "update-1"}
        }

        with patch.object(
            self.handler, "_node_group_states", return_value=current
        ), patch.object(
            self.handler, "_rds_status", return_value="stopped"
        ), patch.object(
            self.handler, "_put_json_parameter"
        ) as put_state:
            result = self.handler.start_environment()

        self.handler.EKS.update_nodegroup_config.assert_called_once_with(
            clusterName="minirtos-eks",
            nodegroupName="minirtos-nodes",
            scalingConfig={"desiredSize": 2, "minSize": 1, "maxSize": 2},
        )
        self.handler.RDS.start_db_instance.assert_called_once()
        self.assertEqual(result["restored_capacity"], self.handler.DEFAULT_CAPACITY)
        self.assertEqual(put_state.call_args.args[1]["desired_state"], "running")

    def test_destroy_scales_workers_to_zero_and_temporarily_stops_rds(self):
        current = {
            "minirtos-nodes": {
                "status": "ACTIVE",
                "desiredSize": 2,
                "minSize": 1,
                "maxSize": 2,
            }
        }
        self.handler.EKS.update_nodegroup_config.return_value = {
            "update": {"id": "update-2"}
        }

        with patch.object(
            self.handler, "_node_group_states", return_value=current
        ), patch.object(
            self.handler, "_rds_status", return_value="available"
        ), patch.object(
            self.handler, "_put_json_parameter"
        ) as put_state:
            result = self.handler.stop_environment()

        self.handler.EKS.update_nodegroup_config.assert_called_once_with(
            clusterName="minirtos-eks",
            nodegroupName="minirtos-nodes",
            scalingConfig={"desiredSize": 0, "minSize": 0, "maxSize": 2},
        )
        self.handler.RDS.stop_db_instance.assert_called_once()
        self.assertTrue(result["temporary"])
        self.assertEqual(put_state.call_args.args[1]["desired_state"], "stopped")

    def test_status_reports_requested_state(self):
        with patch.object(
            self.handler,
            "_get_json_parameter",
            return_value={"desired_state": "stopped"},
        ), patch.object(
            self.handler, "_node_group_states", return_value={}
        ), patch.object(
            self.handler, "_rds_status", return_value="stopped"
        ):
            result = self.handler.power_status()

        self.assertEqual(result["requested_state"], "stopped")
        self.assertEqual(result["rds_status"], "stopped")

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

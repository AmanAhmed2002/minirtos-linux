data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  name_prefix               = "${var.project_name}-${var.environment}-cost-control"
  state_parameter_prefix    = "/${var.project_name}/${var.environment}/cost-control"
  phone_number_resource_arn = "arn:${data.aws_partition.current.partition}:sms-voice:${var.aws_region}:${data.aws_caller_identity.current.account_id}:phone-number/*"
  node_group_resource_arn   = "arn:${data.aws_partition.current.partition}:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:nodegroup/${var.eks_cluster_name}/*/*"
}

data "archive_file" "controller" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.root}/.terraform/${local.name_prefix}.zip"
}

resource "aws_secretsmanager_secret" "phone_configuration" {
  name                    = "${local.name_prefix}-phone"
  description             = "Authorized E.164 phone number and AWS End User Messaging origination identity for MiniRTOS cost controls"
  recovery_window_in_days = 7

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_sns_topic" "inbound_sms" {
  name = "${local.name_prefix}-inbound-sms"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

data "aws_iam_policy_document" "inbound_sms" {
  statement {
    sid    = "OwnerAccess"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    actions = [
      "sns:AddPermission",
      "sns:DeleteTopic",
      "sns:GetTopicAttributes",
      "sns:ListSubscriptionsByTopic",
      "sns:Publish",
      "sns:RemovePermission",
      "sns:SetTopicAttributes",
      "sns:Subscribe"
    ]
    resources = [aws_sns_topic.inbound_sms.arn]
  }

  statement {
    sid    = "AllowAwsEndUserMessagingSms"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sms-voice.amazonaws.com"]
    }

    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.inbound_sms.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:sms-voice:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }
}

resource "aws_sns_topic_policy" "inbound_sms" {
  arn    = aws_sns_topic.inbound_sms.arn
  policy = data.aws_iam_policy_document.inbound_sms.json
}

resource "aws_iam_role" "controller" {
  name = "${local.name_prefix}-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_iam_role_policy_attachment" "controller_logs" {
  role       = aws_iam_role.controller.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "controller" {
  statement {
    sid       = "ListEksNodeGroups"
    effect    = "Allow"
    actions   = ["eks:ListNodegroups"]
    resources = [var.eks_cluster_arn]
  }

  statement {
    sid    = "ManageEksNodeGroupCapacity"
    effect = "Allow"
    actions = [
      "eks:DescribeNodegroup",
      "eks:UpdateNodegroupConfig"
    ]
    resources = [local.node_group_resource_arn]
  }

  statement {
    sid    = "ManageRdsPower"
    effect = "Allow"
    actions = [
      "rds:DescribeDBInstances",
      "rds:StartDBInstance",
      "rds:StopDBInstance"
    ]
    resources = [var.rds_instance_arn]
  }

  statement {
    sid    = "PersistAutomationState"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:PutParameter"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.state_parameter_prefix}/*"
    ]
  }

  statement {
    sid       = "ReadPhoneConfiguration"
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.phone_configuration.arn]
  }

  statement {
    sid       = "ReadAwsCosts"
    effect    = "Allow"
    actions   = ["ce:GetCostAndUsage"]
    resources = ["*"]
  }

  statement {
    sid       = "SendCostControlSms"
    effect    = "Allow"
    actions   = ["sms-voice:SendTextMessage"]
    resources = [local.phone_number_resource_arn]
  }
}

resource "aws_iam_role_policy" "controller" {
  name   = local.name_prefix
  role   = aws_iam_role.controller.id
  policy = data.aws_iam_policy_document.controller.json
}

resource "aws_cloudwatch_log_group" "controller" {
  name              = "/aws/lambda/${local.name_prefix}"
  retention_in_days = 14
}

resource "aws_lambda_function" "controller" {
  function_name = local.name_prefix
  description   = "Stops/restores MiniRTOS EKS workers and RDS and sends threshold-based AWS cost SMS alerts"
  role          = aws_iam_role.controller.arn
  handler       = "handler.lambda_handler"
  runtime       = "python3.12"
  timeout       = 120
  memory_size   = 256

  filename         = data.archive_file.controller.output_path
  source_code_hash = data.archive_file.controller.output_base64sha256

  environment {
    variables = {
      AWS_CONTROL_REGION         = var.aws_region
      EKS_CLUSTER_NAME           = var.eks_cluster_name
      RDS_INSTANCE_IDENTIFIER    = var.rds_instance_identifier
      DEFAULT_NODE_DESIRED_COUNT = tostring(var.default_node_desired_count)
      DEFAULT_NODE_MIN_COUNT     = tostring(var.default_node_min_count)
      DEFAULT_NODE_MAX_COUNT     = tostring(var.default_node_max_count)
      POWER_STATE_PARAMETER      = "${local.state_parameter_prefix}/power-state"
      COST_STATE_PARAMETER       = "${local.state_parameter_prefix}/cost-alert-state"
      PHONE_CONFIG_SECRET_ARN    = aws_secretsmanager_secret.phone_configuration.arn
      COST_ALERT_START_USD       = tostring(var.cost_alert_start_usd)
      COST_ALERT_INCREMENT_USD   = tostring(var.cost_alert_increment_usd)
      SMS_MAX_PRICE_USD          = "0.50"
      LOCAL_TIME_ZONE            = var.schedule_time_zone
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.controller,
    aws_iam_role_policy.controller,
    aws_iam_role_policy_attachment.controller_logs
  ]

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_lambda_permission" "inbound_sms" {
  statement_id  = "AllowInboundSmsFromSns"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.controller.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.inbound_sms.arn
}

resource "aws_sns_topic_subscription" "inbound_sms" {
  topic_arn = aws_sns_topic.inbound_sms.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.controller.arn

  depends_on = [
    aws_lambda_permission.inbound_sms,
    aws_sns_topic_policy.inbound_sms
  ]
}

resource "aws_iam_role" "scheduler" {
  name = "${local.name_prefix}-scheduler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "scheduler.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

data "aws_iam_policy_document" "scheduler" {
  statement {
    sid       = "InvokeCostController"
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.controller.arn]
  }
}

resource "aws_iam_role_policy" "scheduler" {
  name   = "${local.name_prefix}-scheduler"
  role   = aws_iam_role.scheduler.id
  policy = data.aws_iam_policy_document.scheduler.json
}

resource "aws_scheduler_schedule" "daily_maintenance" {
  name                         = "${local.name_prefix}-daily"
  description                  = "Checks AWS spend and reconciles a requested temporary shutdown every day"
  schedule_expression          = var.daily_schedule_expression
  schedule_expression_timezone = var.schedule_time_zone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.controller.arn
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      action = "daily-maintenance"
      source = "eventbridge-scheduler"
    })

    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 2
    }
  }

  depends_on = [aws_iam_role_policy.scheduler]
}

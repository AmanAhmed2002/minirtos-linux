variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Environment controlled by the automation."
  type        = string
}

variable "aws_region" {
  description = "AWS Region containing EKS, RDS, Lambda, SNS, and SMS resources."
  type        = string
}

variable "eks_cluster_name" {
  description = "EKS cluster whose managed node groups are scaled to zero and restored."
  type        = string
}

variable "eks_cluster_arn" {
  description = "EKS cluster ARN used for least-privilege Lambda permissions."
  type        = string
}

variable "default_node_desired_count" {
  description = "Fallback desired capacity when no saved pre-shutdown state exists."
  type        = number
}

variable "default_node_min_count" {
  description = "Fallback minimum capacity when no saved pre-shutdown state exists."
  type        = number
}

variable "default_node_max_count" {
  description = "Fallback maximum capacity when no saved pre-shutdown state exists."
  type        = number
}

variable "rds_instance_identifier" {
  description = "RDS DB instance stopped and started with the EKS workers."
  type        = string
}

variable "rds_instance_arn" {
  description = "RDS DB instance ARN used for least-privilege Lambda permissions."
  type        = string
}

variable "cost_alert_start_usd" {
  description = "First month-to-date actual-spend SMS threshold."
  type        = number

  validation {
    condition     = var.cost_alert_start_usd > 0
    error_message = "cost_alert_start_usd must be greater than zero."
  }
}

variable "cost_alert_increment_usd" {
  description = "Spend interval between repeat SMS alerts."
  type        = number

  validation {
    condition     = var.cost_alert_increment_usd > 0
    error_message = "cost_alert_increment_usd must be greater than zero."
  }
}

variable "daily_schedule_expression" {
  description = "EventBridge Scheduler cron expression for the daily cost and shutdown-state check."
  type        = string
  default     = "cron(5 9 * * ? *)"
}

variable "schedule_time_zone" {
  description = "IANA time zone used by EventBridge Scheduler and month-boundary calculations."
  type        = string
  default     = "America/Toronto"
}

output "lambda_function_name" {
  description = "Name of the cost-control Lambda function."
  value       = aws_lambda_function.controller.function_name
}

output "lambda_function_arn" {
  description = "ARN of the cost-control Lambda function."
  value       = aws_lambda_function.controller.arn
}

output "inbound_sms_topic_arn" {
  description = "SNS destination for AWS End User Messaging two-way SMS."
  value       = aws_sns_topic.inbound_sms.arn
}

output "phone_configuration_secret_arn" {
  description = "Secret that stores the authorized destination number and SMS origination identity."
  value       = aws_secretsmanager_secret.phone_configuration.arn
}

output "daily_schedule_arn" {
  description = "ARN of the Toronto-time daily maintenance schedule."
  value       = aws_scheduler_schedule.daily_maintenance.arn
}

output "github_token_secret_arn" {
  description = "Secret that must be populated with a fine-grained GitHub token before DESTROY or START can dispatch the provisioning workflow."
  value       = aws_secretsmanager_secret.github_token.arn
}

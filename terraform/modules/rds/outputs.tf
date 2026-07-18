output "endpoint" {
  description = "RDS hostname/address without port."
  value       = aws_db_instance.postgres.address
}

output "port" {
  description = "RDS PostgreSQL port."
  value       = aws_db_instance.postgres.port
}

output "database_name" {
  description = "RDS database name."
  value       = aws_db_instance.postgres.db_name
}

output "username" {
  description = "RDS master username."
  value       = aws_db_instance.postgres.username
}

output "security_group_id" {
  description = "RDS security group ID."
  value       = aws_security_group.rds.id
}

output "master_user_secret_arn" {
  description = "Secrets Manager ARN for the RDS-managed master password."
  value       = aws_db_instance.postgres.master_user_secret[0].secret_arn
}

output "instance_identifier" {
  description = "RDS DB instance identifier used by start/stop automation."
  value       = aws_db_instance.postgres.identifier
}

output "instance_arn" {
  description = "RDS DB instance ARN used by start/stop automation."
  value       = aws_db_instance.postgres.arn
}

variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Environment name, for example dev."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where RDS should be created."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet IDs for the RDS DB subnet group. Must span at least two AZs."
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Security group ID used by EKS worker nodes/pods that need to connect to RDS."
  type        = string
}

variable "database_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "minirtos_playground"
}

variable "database_username" {
  description = "RDS master username."
  type        = string
  default     = "minirtos"
}

variable "engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16"
}

variable "instance_class" {
  description = "RDS instance size."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial storage in GB."
  type        = number
  default     = 20
}

variable "backup_retention_period" {
  description = "Backup retention period in days. Use 0 for dev/free-tier accounts to disable automated backups."
  type        = number
  default     = 0
}

variable "tags" {
  description = "Tags to apply to RDS resources."
  type        = map(string)
  default     = {}
}

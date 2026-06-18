variable "aws_region" {
  description = "AWS region for Terraform remote state resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for remote state resource names"
  type        = string
  default     = "minirtos"
}

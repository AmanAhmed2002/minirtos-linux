variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
}

variable "availability_zones" {
  description = "AZs to deploy into (must be in the chosen region)"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.34"
}

variable "environment_enabled" {
  description = "Creates the billable environment (EKS control plane, workers, RDS) when true. Texting DESTROY applies false and texting START applies true. The VPC, cost-control Lambda, SMS wiring, and GitHub OIDC roles are kept either way so the environment can always be restarted."
  type        = bool

  # Deliberately has no default. A default of true would let a bare
  # `terraform apply` silently rebuild a ~$73/month cluster, and a default of
  # false would let one silently destroy a running environment. Both directions
  # must be stated explicitly.
}

variable "rds_deletion_protection" {
  description = "Deletion protection on the RDS instance. Must be false for a teardown to succeed, since the environment is rebuilt from the final snapshot."
  type        = bool
  default     = false
}

variable "rds_restore_snapshot_identifier" {
  description = "Snapshot the database is restored from when the environment is rebuilt. START resolves this to the newest snapshot automatically; empty creates an empty database."
  type        = string
  default     = ""
}

variable "rds_final_snapshot_identifier" {
  description = "Name for the snapshot taken during teardown. Must be unique per teardown; the workflow passes a timestamped value."
  type        = string
  default     = ""
}

variable "provision_workflow" {
  description = "Workflow file that runs terraform for full teardown and rebuild, dispatched by the cost-control Lambda when DESTROY or START is texted."
  type        = string
  default     = "provision-aws.yml"
}

variable "eks_node_desired_count" {
  description = "Worker-node capacity restored when the dev environment starts."
  type        = number
  default     = 2

  validation {
    condition     = var.eks_node_desired_count >= 0
    error_message = "eks_node_desired_count must be zero or greater."
  }
}

variable "eks_node_min_count" {
  description = "Worker-node minimum restored when the dev environment starts."
  type        = number
  default     = 1

  validation {
    condition     = var.eks_node_min_count >= 0
    error_message = "eks_node_min_count must be zero or greater."
  }
}

variable "eks_node_max_count" {
  description = "Worker-node maximum restored when the dev environment starts."
  type        = number
  default     = 2

  validation {
    condition     = var.eks_node_max_count > 0
    error_message = "eks_node_max_count must be greater than zero."
  }
}

variable "cost_alert_start_usd" {
  description = "Actual month-to-date AWS spend that triggers the first SMS alert."
  type        = number
  default     = 20

  validation {
    condition     = var.cost_alert_start_usd > 0
    error_message = "cost_alert_start_usd must be greater than zero."
  }
}

variable "cost_alert_increment_usd" {
  description = "Additional month-to-date spend between repeat SMS alerts."
  type        = number
  default     = 10

  validation {
    condition     = var.cost_alert_increment_usd > 0
    error_message = "cost_alert_increment_usd must be greater than zero."
  }
}

variable "cost_alert_max_usd" {
  description = "Final actual month-to-date AWS spend that triggers an SMS alert."
  type        = number
  default     = 50

  validation {
    condition     = var.cost_alert_max_usd > 0
    error_message = "cost_alert_max_usd must be greater than zero."
  }
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy to AWS through OIDC, in owner/repo format"
  type        = string
  default     = "AmanAhmed2002/minirtos-linux"
}

variable "github_deploy_branch" {
  description = "Git branch allowed to assume the GitHub Actions AWS deploy role"
  type        = string
  default     = "main"
}

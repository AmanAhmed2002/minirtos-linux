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

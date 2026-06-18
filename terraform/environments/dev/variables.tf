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

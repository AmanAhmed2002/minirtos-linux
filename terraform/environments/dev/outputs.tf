output "cluster_name" {
  description = "EKS cluster name — use with aws eks update-kubeconfig"
  value       = module.eks.cluster_name
}

output "cluster_version" {
  description = "Kubernetes version configured for the EKS cluster"
  value       = module.eks.cluster_version
}

output "cluster_endpoint" {
  description = "EKS API endpoint"
  value       = module.eks.cluster_endpoint
}

output "aws_region" {
  description = "Region the cluster was deployed to"
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC ID used by the EKS cluster and AWS Load Balancer Controller"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs used by the EKS cluster and public ALB"
  value       = module.vpc.public_subnet_ids
}

output "aws_load_balancer_controller_role_arn" {
  description = "IAM role ARN used by the AWS Load Balancer Controller service account"
  value       = module.eks.aws_load_balancer_controller_role_arn
}



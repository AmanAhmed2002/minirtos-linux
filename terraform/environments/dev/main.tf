terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  # The billable environment (EKS control plane, workers, RDS) is created only
  # when enabled. Texting DESTROY flips this to false and texting START flips it
  # back, so a teardown is an ordinary apply rather than a one-off operation.
  enabled = var.environment_enabled ? 1 : 0

  # Resource names are derived rather than read from the modules so that the
  # cost-control Lambda keeps working while EKS and RDS do not exist. Taking a
  # dependency on module outputs here would make Terraform destroy the Lambda
  # alongside the cluster, removing the only way to text START.
  eks_cluster_name = "${var.project_name}-eks"
  eks_cluster_arn  = "arn:aws:eks:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${local.eks_cluster_name}"

  rds_instance_identifier = "${var.project_name}-dev-postgres"
  rds_instance_arn        = "arn:aws:rds:${var.aws_region}:${data.aws_caller_identity.current.account_id}:db:${local.rds_instance_identifier}"
}

# The VPC is free (no NAT gateway) and is deliberately kept across teardowns so
# subnet and routing identifiers stay stable.
module "vpc" {
  source             = "../../modules/vpc"
  project_name       = var.project_name
  availability_zones = var.availability_zones
}

module "eks" {
  count = local.enabled

  source             = "../../modules/eks"
  project_name       = var.project_name
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  node_instance_type = "t3.small"
  node_desired_count = var.eks_node_desired_count
  node_min_count     = var.eks_node_min_count
  node_max_count     = var.eks_node_max_count
  kubernetes_version = var.kubernetes_version
}

data "aws_eks_cluster" "main" {
  count = local.enabled
  name  = module.eks[0].cluster_name
}

module "rds" {
  count = local.enabled

  source = "../../modules/rds"

  project_name = var.project_name
  environment  = "dev"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  eks_node_security_group_id = data.aws_eks_cluster.main[0].vpc_config[0].cluster_security_group_id

  database_name     = "minirtos_playground"
  database_username = "minirtos"

  deletion_protection       = var.rds_deletion_protection
  snapshot_identifier       = var.rds_restore_snapshot_identifier
  final_snapshot_identifier = var.rds_final_snapshot_identifier

  tags = {
    Project     = var.project_name
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

module "cost_controls" {
  source = "../../modules/cost-controls"

  project_name = var.project_name
  environment  = "dev"
  aws_region   = var.aws_region

  eks_cluster_name = local.eks_cluster_name
  eks_cluster_arn  = local.eks_cluster_arn

  default_node_desired_count = var.eks_node_desired_count
  default_node_min_count     = var.eks_node_min_count
  default_node_max_count     = var.eks_node_max_count

  rds_instance_identifier = local.rds_instance_identifier
  rds_instance_arn        = local.rds_instance_arn

  cost_alert_start_usd     = var.cost_alert_start_usd
  cost_alert_increment_usd = var.cost_alert_increment_usd
  cost_alert_max_usd       = var.cost_alert_max_usd

  # Full teardown and rebuild run as a GitHub Actions workflow because they take
  # far longer than the Lambda's 15-minute ceiling.
  github_repository    = var.github_repository
  github_deploy_branch = var.github_deploy_branch
  provision_workflow   = var.provision_workflow
}

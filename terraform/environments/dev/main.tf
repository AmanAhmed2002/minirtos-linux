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

module "vpc" {
  source             = "../../modules/vpc"
  project_name       = var.project_name
  availability_zones = var.availability_zones
}

module "eks" {
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
  name = module.eks.cluster_name
}

module "rds" {
  source = "../../modules/rds"

  project_name = var.project_name
  environment  = "dev"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  eks_node_security_group_id = data.aws_eks_cluster.main.vpc_config[0].cluster_security_group_id

  database_name     = "minirtos_playground"
  database_username = "minirtos"

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

  eks_cluster_name = module.eks.cluster_name
  eks_cluster_arn  = module.eks.cluster_arn

  default_node_desired_count = var.eks_node_desired_count
  default_node_min_count     = var.eks_node_min_count
  default_node_max_count     = var.eks_node_max_count

  rds_instance_identifier = module.rds.instance_identifier
  rds_instance_arn        = module.rds.instance_arn

  cost_alert_start_usd     = var.cost_alert_start_usd
  cost_alert_increment_usd = var.cost_alert_increment_usd
  cost_alert_max_usd       = var.cost_alert_max_usd
}

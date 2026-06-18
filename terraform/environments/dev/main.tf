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

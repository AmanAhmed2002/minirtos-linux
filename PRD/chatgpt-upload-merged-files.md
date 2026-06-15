# MiniRTOS Files for ChatGPT Upload

Generated from the current workspace on 2026-06-15.

## .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read
  packages: write

jobs:
  build-and-test:
    name: Build and Test Runtime + Analyzer
    runs-on: ubuntu-24.04

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            build-essential \
            cmake \
            ninja-build \
            python3 \
            python3-pip

      - name: Install Python dependencies
        run: |
          python3 -m pip install --upgrade pip
          python3 -m pip install pytest scikit-learn joblib

      - name: Configure C++ build
        run: |
          cmake -S cpp-runtime -B cpp-runtime/build -G Ninja

      - name: Build C++ runtime and tests
        run: |
          cmake --build cpp-runtime/build

      - name: Run C++ tests
        run: |
          ctest --test-dir cpp-runtime/build --output-on-failure

      - name: Run Python tests
        run: |
          python3 -m pytest ai-analyzer/tests -q

  frontend-tests:
    name: Test Frontend Dashboard
    runs-on: ubuntu-24.04

    defaults:
      run:
        working-directory: frontend

    steps:
      - name: Check out repository
        uses: actions/checkout@v4
   
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: npm ci

      - name: Run frontend tests
        run: npm run test

      - name: Run frontend typecheck
        run: npm run typecheck

      - name: Build frontend
        run: npm run build
  validate-manifests:
    name: Validate Kubernetes Manifests
    runs-on: ubuntu-24.04
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Install kubectl
        uses: azure/setup-kubectl@v4
        with:
          version: "v1.30.0"

      - name: Validate local overlay
        run: kubectl kustomize k8s/overlays/local

      - name: Validate ghcr overlay
        run: kubectl kustomize k8s/overlays/ghcr
  terraform-validate:
    name: Validate Terraform
    runs-on: ubuntu-24.04
    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.6.6"

      - name: Terraform init (no backend)
        working-directory: terraform/environments/dev
        run: terraform init -backend=false

      - name: Terraform validate
        working-directory: terraform/environments/dev
        run: terraform validate
  docker-images:
    name: Build and Publish Docker Images
    runs-on: ubuntu-24.04
    needs:
      - build-and-test
      - frontend-tests
      - validate-manifests
      - terraform-validate
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Compute lowercase image namespace
        id: image-vars
        run: |
          IMAGE_NAMESPACE="ghcr.io/${GITHUB_REPOSITORY,,}"
          echo "backend_image=${IMAGE_NAMESPACE}/backend" >> "$GITHUB_OUTPUT"
          echo "frontend_image=${IMAGE_NAMESPACE}/frontend" >> "$GITHUB_OUTPUT"

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile.backend
          push: true
          tags: |
            ${{ steps.image-vars.outputs.backend_image }}:latest
            ${{ steps.image-vars.outputs.backend_image }}:${{ github.sha }}

      - name: Build and push frontend image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile.frontend
          target: production
          push: true
          build-args: |
            VITE_API_BASE_URL=
          tags: |
            ${{ steps.image-vars.outputs.frontend_image }}:latest
            ${{ steps.image-vars.outputs.frontend_image }}:${{ github.sha }}

```

## .gitignore

```gitignore
# Build outputs
build/
cpp-runtime/build/
**/build/
*.o
*.obj
*.out
*.exe
*.a
*.so
*.dylib

# Runtime logs and generated telemetry
logs/*
!logs/.gitkeep
*.log
*.jsonl

# Generated reports
reports/generated/

# Python
.venv/
venv/
__pycache__/
.pytest_cache/
*.pyc
*.pyo
*.pyd

# CMake/Ninja generated files
CMakeFiles/
CMakeCache.txt
cmake_install.cmake
compile_commands.json
.ninja_deps
.ninja_log

# Docker/local overrides
docker-compose.override.yml

# Environment files
.env
.env.*

# OS/editor files
.DS_Store
.vscode/
.idea/
# Generated ML artifacts
models/*
!models/.gitkeep
*.joblib
*.pkl

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env



# Terraform
**/.terraform/
*.tfstate
*.tfstate.backup
*.tfstate.lock.info
.terraform.lock.hcl
terraform/environments/*/terraform.tfvars


# Local installers / AWS CLI downloads
awscliv2.zip
/aws/

```

## terraform/environments/dev/main.tf

```hcl
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
}

```

## terraform/environments/dev/variables.tf

```hcl
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

```

## terraform/environments/dev/outputs.tf

```hcl
output "cluster_name" {
  description = "EKS cluster name — use with aws eks update-kubeconfig"
  value       = module.eks.cluster_name
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

```

## terraform/environments/dev/versions.tf

Not present in this workspace.

## terraform/environments/dev/terraform.tfvars

```hcl
aws_region         = "us-east-1"
project_name       = "minirtos"
availability_zones = ["us-east-1a", "us-east-1b"]

```

## terraform/modules/eks/main.tf

```hcl
# IAM role for EKS control plane
resource "aws_iam_role" "eks_cluster" {
  name = "${var.project_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# Security group for the control plane
resource "aws_security_group" "eks_cluster" {
  name        = "${var.project_name}-eks-cluster-sg"
  description = "EKS cluster control plane security group"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-eks-cluster-sg"
  }
}

# EKS cluster
resource "aws_eks_cluster" "main" {
  name     = "${var.project_name}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.eks_cluster.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

data "tls_certificate" "eks_oidc" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks_oidc.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# IAM role for worker nodes
resource "aws_iam_role" "eks_nodes" {
  name = "${var.project_name}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_read" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Worker node group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.subnet_ids
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_desired_count
    min_size     = var.node_min_count
    max_size     = var.node_max_count
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_read,
  ]
}

resource "aws_iam_role" "ebs_csi" {
  name = "${var.project_name}-eks-ebs-csi-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi_policy" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

# EBS CSI driver addon — required for dynamic PVC provisioning on EKS
resource "aws_eks_addon" "ebs_csi" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "aws-ebs-csi-driver"
  service_account_role_arn    = aws_iam_role.ebs_csi.arn
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [
    aws_eks_node_group.main,
    aws_iam_openid_connect_provider.eks,
    aws_iam_role_policy_attachment.ebs_csi_policy,
  ]
}

# IAM policy and role for AWS Load Balancer Controller
resource "aws_iam_policy" "aws_load_balancer_controller" {
  name        = "${var.project_name}-aws-load-balancer-controller-policy"
  description = "IAM policy for AWS Load Balancer Controller"
  policy      = file("${path.module}/aws-load-balancer-controller-policy.json")
}

resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "${var.project_name}-aws-load-balancer-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  role       = aws_iam_role.aws_load_balancer_controller.name
  policy_arn = aws_iam_policy.aws_load_balancer_controller.arn
}

```

## terraform/modules/eks/variables.tf

```hcl
variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the cluster lives"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the node group"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.30"
}

variable "node_instance_type" {
  description = "EC2 instance type for worker nodes"
  type        = string
  default     = "t3.micro"
}

variable "node_desired_count" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_min_count" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 2
}

```

## terraform/modules/eks/outputs.tf

```hcl
output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_certificate_authority" {
  description = "Base64-encoded CA cert for the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_version" {
  description = "Kubernetes version"
  value       = aws_eks_cluster.main.version
}

output "aws_load_balancer_controller_role_arn" {
  description = "IAM role ARN for AWS Load Balancer Controller"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

```

## terraform/modules/eks/aws-load-balancer-controller-policy.json

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateServiceLinkedRole"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "iam:AWSServiceName": "elasticloadbalancing.amazonaws.com"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeAccountAttributes",
                "ec2:DescribeAddresses",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeInternetGateways",
                "ec2:DescribeVpcs",
                "ec2:DescribeVpcPeeringConnections",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeInstances",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DescribeTags",
                "ec2:GetCoipPoolUsage",
                "ec2:DescribeCoipPools",
                "ec2:GetSecurityGroupsForVpc",
                "ec2:DescribeIpamPools",
                "ec2:DescribeRouteTables",
                "elasticloadbalancing:DescribeLoadBalancers",
                "elasticloadbalancing:DescribeLoadBalancerAttributes",
                "elasticloadbalancing:DescribeListeners",
                "elasticloadbalancing:DescribeListenerCertificates",
                "elasticloadbalancing:DescribeSSLPolicies",
                "elasticloadbalancing:DescribeRules",
                "elasticloadbalancing:DescribeTargetGroups",
                "elasticloadbalancing:DescribeTargetGroupAttributes",
                "elasticloadbalancing:DescribeTargetHealth",
                "elasticloadbalancing:DescribeTags",
                "elasticloadbalancing:DescribeTrustStores",
                "elasticloadbalancing:DescribeListenerAttributes",
                "elasticloadbalancing:DescribeCapacityReservation"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "cognito-idp:DescribeUserPoolClient",
                "acm:ListCertificates",
                "acm:DescribeCertificate",
                "iam:ListServerCertificates",
                "iam:GetServerCertificate",
                "waf-regional:GetWebACL",
                "waf-regional:GetWebACLForResource",
                "waf-regional:AssociateWebACL",
                "waf-regional:DisassociateWebACL",
                "wafv2:GetWebACL",
                "wafv2:GetWebACLForResource",
                "wafv2:AssociateWebACL",
                "wafv2:DisassociateWebACL",
                "shield:GetSubscriptionState",
                "shield:DescribeProtection",
                "shield:CreateProtection",
                "shield:DeleteProtection"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupIngress"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateSecurityGroup"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateTags"
            ],
            "Resource": "arn:aws:ec2:*:*:security-group/*",
            "Condition": {
                "StringEquals": {
                    "ec2:CreateAction": "CreateSecurityGroup"
                },
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateTags",
                "ec2:DeleteTags"
            ],
            "Resource": "arn:aws:ec2:*:*:security-group/*",
            "Condition": {
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:RevokeSecurityGroupIngress",
                "ec2:DeleteSecurityGroup"
            ],
            "Resource": "*",
            "Condition": {
                "Null": {
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:CreateLoadBalancer",
                "elasticloadbalancing:CreateTargetGroup"
            ],
            "Resource": "*",
            "Condition": {
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:CreateListener",
                "elasticloadbalancing:DeleteListener",
                "elasticloadbalancing:CreateRule",
                "elasticloadbalancing:DeleteRule"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:AddTags",
                "elasticloadbalancing:RemoveTags"
            ],
            "Resource": [
                "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
                "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
                "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
            ],
            "Condition": {
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:AddTags",
                "elasticloadbalancing:RemoveTags"
            ],
            "Resource": [
                "arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*",
                "arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*",
                "arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*",
                "arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:ModifyLoadBalancerAttributes",
                "elasticloadbalancing:SetIpAddressType",
                "elasticloadbalancing:SetSecurityGroups",
                "elasticloadbalancing:SetSubnets",
                "elasticloadbalancing:DeleteLoadBalancer",
                "elasticloadbalancing:ModifyTargetGroup",
                "elasticloadbalancing:ModifyTargetGroupAttributes",
                "elasticloadbalancing:DeleteTargetGroup",
                "elasticloadbalancing:ModifyListenerAttributes",
                "elasticloadbalancing:ModifyCapacityReservation",
                "elasticloadbalancing:ModifyIpPools"
            ],
            "Resource": "*",
            "Condition": {
                "Null": {
                    "aws:ResourceTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:AddTags"
            ],
            "Resource": [
                "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
                "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
                "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
            ],
            "Condition": {
                "StringEquals": {
                    "elasticloadbalancing:CreateAction": [
                        "CreateTargetGroup",
                        "CreateLoadBalancer"
                    ]
                },
                "Null": {
                    "aws:RequestTag/elbv2.k8s.aws/cluster": "false"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:RegisterTargets",
                "elasticloadbalancing:DeregisterTargets"
            ],
            "Resource": "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "elasticloadbalancing:SetWebAcl",
                "elasticloadbalancing:ModifyListener",
                "elasticloadbalancing:AddListenerCertificates",
                "elasticloadbalancing:RemoveListenerCertificates",
                "elasticloadbalancing:ModifyRule",
                "elasticloadbalancing:SetRulePriorities"
            ],
            "Resource": "*"
        }
    ]
}

```

## k8s/base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - 00-namespace.yml
  - 01-postgres-secret.yml
  - 02-backend-configmap.yml
  - 03-postgres-statefulset.yml
  - 04-backend-deployment.yml
  - 05-frontend-deployment.yml

```

## k8s/base/04-backend-deployment.yml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minirtos-backend-runs
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-backend
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi

---
apiVersion: v1
kind: Service
metadata:
  name: minirtos-backend
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-backend
  annotations:
    alb.ingress.kubernetes.io/healthcheck-path: /actuator/health/readiness
    alb.ingress.kubernetes.io/success-codes: "200"
spec:
  type: ClusterIP
  selector:
    app: minirtos-backend
  ports:
    - name: http
      port: 8081
      targetPort: 8081

---
apiVersion: v1
kind: Service
metadata:
  name: minirtos-backend-nodeport
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-backend
spec:
  type: NodePort
  selector:
    app: minirtos-backend
  ports:
    - name: http
      port: 8081
      targetPort: 8081
      nodePort: 30081

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minirtos-backend
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minirtos-backend
  template:
    metadata:
      labels:
        app: minirtos-backend
        app.kubernetes.io/name: minirtos-backend
    spec:
      containers:
        - name: backend
          image: minirtos-backend-placeholder:latest
          ports:
            - name: http
              containerPort: 8081
          envFrom:
            - configMapRef:
                name: minirtos-backend-config
          env:
            - name: SPRING_DATASOURCE_USERNAME
              valueFrom:
                secretKeyRef:
                  name: minirtos-postgres-secret
                  key: POSTGRES_USER
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minirtos-postgres-secret
                  key: POSTGRES_PASSWORD
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8081
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 12
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8081
            initialDelaySeconds: 45
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 6
          volumeMounts:
            - name: backend-runs
              mountPath: /app/runs
            - name: backend-logs
              mountPath: /app/logs
      volumes:
        - name: backend-runs
          persistentVolumeClaim:
            claimName: minirtos-backend-runs
        - name: backend-logs
          emptyDir: {}

```

## k8s/base/05-frontend-deployment.yml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: minirtos-frontend
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-frontend
spec:
  type: ClusterIP
  selector:
    app: minirtos-frontend
  ports:
    - name: http
      port: 80
      targetPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: minirtos-frontend-nodeport
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-frontend
  annotations:
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/success-codes: "200"
spec:
  type: NodePort
  selector:
    app: minirtos-frontend
  ports:
    - name: http
      port: 80
      targetPort: 80
      nodePort: 30080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minirtos-frontend
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minirtos-frontend
  template:
    metadata:
      labels:
        app: minirtos-frontend
        app.kubernetes.io/name: minirtos-frontend
    spec:
      containers:
        - name: frontend
          image: minirtos-frontend-placeholder:latest
          ports:
            - name: http
              containerPort: 80
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 6
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 6

```

## k8s/base backend/frontend service YAML files if separate

No separate backend/frontend service YAML files were found; the Service resources are included inside k8s/base/04-backend-deployment.yml and k8s/base/05-frontend-deployment.yml.

## k8s/overlays/local/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - path: patch-backend-image.yml
  - path: patch-frontend-image.yml

```

## k8s/overlays/ghcr/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  - path: patch-backend-image.yml
  - path: patch-frontend-image.yml

```

## k8s/overlays/aws/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - storageclass-gp3.yml
  - minirtos-ingress.yml

images:
  - name: minirtos-backend-placeholder
    newName: ghcr.io/amanahmed2002/minirtos-linux/backend
    newTag: latest
  - name: minirtos-frontend-placeholder
    newName: ghcr.io/amanahmed2002/minirtos-linux/frontend
    newTag: latest

```

## k8s/overlays/aws/minirtos-ingress.yml

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minirtos-ingress
  namespace: minirtos
  labels:
    app.kubernetes.io/name: minirtos-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80}]'
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: minirtos-backend
                port:
                  number: 8081
          - path: /
            pathType: Prefix
            backend:
              service:
                name: minirtos-frontend
                port:
                  number: 80

```

## k8s/overlays/aws/storageclass-gp3.yml

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3

```

## docker/Dockerfile.frontend

```dockerfile
# syntax=docker/dockerfile:1

# -------------------------------
# Base frontend dependency stage
# -------------------------------
FROM node:22-alpine AS base

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY frontend/ ./


# -------------------------------
# Development stage
# Used by docker compose frontend-dev
# -------------------------------
FROM base AS dev

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# -------------------------------
# Production build stage
# -------------------------------
FROM base AS build

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build


# -------------------------------
# Production Nginx serving stage
# -------------------------------
FROM nginx:1.27-alpine AS production

COPY docker/nginx.frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

```

## docker/Dockerfile.backend

```dockerfile
FROM maven:3.9.9-eclipse-temurin-17 AS backend-build

WORKDIR /app

COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src

WORKDIR /app/backend
RUN mvn -q -DskipTests package

FROM ubuntu:24.04 AS runtime-build

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        ninja-build \
        python3 \
        python3-pip \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY cpp-runtime cpp-runtime

RUN cmake -S cpp-runtime -B cpp-runtime/build -G Ninja \
    && cmake --build cpp-runtime/build

FROM eclipse-temurin:17-jre

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=backend-build /app/backend/target/minirtos-playground-backend.jar app.jar
COPY --from=runtime-build /app/cpp-runtime/build/minirtos_runtime cpp-runtime/build/minirtos_runtime
COPY configs configs
COPY ai-analyzer ai-analyzer

RUN mkdir -p logs runs reports/generated models

ENV MINIRTOS_PROJECT_ROOT=/app
ENV MINIRTOS_RUNTIME_BINARY=cpp-runtime/build/minirtos_runtime
ENV MINIRTOS_PYTHON_COMMAND=python3
ENV MINIRTOS_ANALYZER_SCRIPT=ai-analyzer/app/analyze.py
ENV MINIRTOS_LOGS_DIR=logs
ENV MINIRTOS_RUNS_DIR=runs
ENV MINIRTOS_WINDOW_MS=5000
ENV MINIRTOS_PROCESS_TIMEOUT_SECONDS=120

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]

```

## frontend/src/api/minirtosApi.ts

```typescript
import type {
  AnalysisResponse,
  CreateRunRequest,
  RunSummaryResponse,
  ScenarioResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText || `Request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getScenarios(): Promise<ScenarioResponse[]> {
  return request<ScenarioResponse[]>("/api/scenarios");
}

export async function createRun(
  scenarioId: string
): Promise<RunSummaryResponse> {
  const body: CreateRunRequest = { scenarioId };

  return request<RunSummaryResponse>("/api/runs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRuns(): Promise<RunSummaryResponse[]> {
  return request<RunSummaryResponse[]>("/api/runs");
}

export async function getRunAnalysis(
  runId: string
): Promise<AnalysisResponse> {
  return request<AnalysisResponse>(`/api/runs/${encodeURIComponent(runId)}/analysis`);
}

```

## backend/src/main/java/com/minirtos/playground/config/CorsConfig.java

```java
package com.minirtos.playground.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins(
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://localhost:3000",
                        "http://127.0.0.1:3000",
                        "http://localhost:30080",
                        "http://127.0.0.1:30080"
                    )
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders("*");
            }
        };
    }
}

```

## scripts/k8s_smoke_test.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-http://localhost:30080}"
APP_URL="${APP_URL%/}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required to run scripts/k8s_smoke_test.sh"
  exit 2
fi

echo ""
echo "=== MiniRTOS Playground — ALB Smoke Test ==="
echo "App URL: $APP_URL"
echo ""

fail=0

check() {
  local label="$1"
  local url="$2"
  local expected="$3"

  response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" || echo "000")

  if [ "$response" = "$expected" ]; then
    echo "  PASS  $label ($url) -> $response"
  else
    echo "  FAIL  $label ($url) -> got $response, expected $expected"
    fail=1
  fi
}

echo "--- Frontend ---"
check "frontend root"    "$APP_URL/"       200
check "frontend health"  "$APP_URL/health" 200

echo ""
echo "--- Backend through ALB /api path ---"
check "api/health"    "$APP_URL/api/health"    200
check "api/scenarios" "$APP_URL/api/scenarios" 200
check "api/runs"      "$APP_URL/api/runs"      200

echo ""
if [ "$fail" -eq 0 ]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi

```

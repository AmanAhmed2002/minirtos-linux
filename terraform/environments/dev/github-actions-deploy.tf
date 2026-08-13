data "aws_caller_identity" "current" {}

data "tls_certificate" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    data.tls_certificate.github_actions.certificates[0].sha1_fingerprint
  ]

  tags = {
    Project = var.project_name
    Managed = "terraform"
  }
}

data "aws_iam_policy_document" "github_actions_deploy_trust" {
  statement {
    sid     = "AllowGitHubActionsOIDC"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type = "Federated"
      identifiers = [
        aws_iam_openid_connect_provider.github_actions.arn
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repository}:ref:refs/heads/${var.github_deploy_branch}"
      ]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name               = "${var.project_name}-github-actions-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_actions_deploy_trust.json

  tags = {
    Project = var.project_name
    Managed = "terraform"
  }
}

data "aws_iam_policy_document" "github_actions_deploy_permissions" {
  statement {
    sid    = "AllowDescribeEksCluster"
    effect = "Allow"

    actions = [
      "eks:DescribeCluster"
    ]

    resources = [
      local.eks_cluster_arn
    ]
  }

  # The deploy and hourly-sync workflows resolve the RDS endpoint and managed
  # secret ARN at run time, because both change when the environment is torn
  # down and rebuilt.
  statement {
    sid       = "AllowDescribeRdsInstances"
    effect    = "Allow"
    actions   = ["rds:DescribeDBInstances"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowReadRdsMasterSecret"
    effect = "Allow"

    actions = [
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue"
    ]

    # The RDS-managed secret is recreated with a new random suffix every time the
    # environment is rebuilt, so this cannot be pinned to a single ARN.
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:rds!db-*"
    ]
  }

  statement {
    sid    = "InvokeCostControl"
    effect = "Allow"

    actions = [
      "lambda:InvokeFunction"
    ]

    resources = [
      module.cost_controls.lambda_function_arn
    ]
  }
}

resource "aws_iam_policy" "github_actions_deploy" {
  name        = "${var.project_name}-github-actions-deploy"
  description = "Allows GitHub Actions to describe the MiniRTOS EKS cluster before kubectl deployment"
  policy      = data.aws_iam_policy_document.github_actions_deploy_permissions.json

  tags = {
    Project = var.project_name
    Managed = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions_deploy" {
  role       = aws_iam_role.github_actions_deploy.name
  policy_arn = aws_iam_policy.github_actions_deploy.arn
}

resource "aws_eks_access_entry" "github_actions_deploy" {
  count = local.enabled

  cluster_name  = module.eks[0].cluster_name
  principal_arn = aws_iam_role.github_actions_deploy.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "github_actions_deploy_cluster_admin" {
  count = local.enabled

  cluster_name  = module.eks[0].cluster_name
  principal_arn = aws_iam_role.github_actions_deploy.arn

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [
    aws_eks_access_entry.github_actions_deploy
  ]
}

# Terraform itself creates EKS, RDS, VPC and IAM resources, which the narrowly
# scoped deploy role above cannot do. The rebuild workflow assumes this separate
# role instead. It is still restricted to the deploy branch of one repository.
resource "aws_iam_role" "github_actions_provision" {
  name               = "${var.project_name}-github-actions-provision"
  assume_role_policy = data.aws_iam_policy_document.github_actions_deploy_trust.json

  tags = {
    Project = var.project_name
    Managed = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions_provision" {
  role       = aws_iam_role.github_actions_provision.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

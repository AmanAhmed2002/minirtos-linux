locals {
  name = "${var.project_name}-${var.environment}-postgres"
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${local.name}-subnet-group"
  })
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-sg"
  description = "Allow MiniRTOS backend pods/nodes to connect to RDS PostgreSQL"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${local.name}-sg"
  })
}

resource "aws_security_group_rule" "postgres_from_eks_nodes" {
  type                     = "ingress"
  description              = "PostgreSQL from EKS nodes"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = var.eks_node_security_group_id
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
}

resource "aws_security_group_rule" "egress_all" {
  type              = "egress"
  description       = "Allow outbound traffic from RDS security group"
  security_group_id = aws_security_group.rds.id
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
}

resource "aws_db_instance" "postgres" {
  identifier = local.name

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  # A snapshot restore carries its own database name and master user, so both
  # must be omitted when restoring or RDS rejects the request.
  db_name  = var.snapshot_identifier == "" ? var.database_name : null
  username = var.snapshot_identifier == "" ? var.database_username : null

  snapshot_identifier = var.snapshot_identifier == "" ? null : var.snapshot_identifier

  manage_master_user_password = true

  port                   = 5432
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az = false

  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection

  # Every teardown keeps the data. The identifier must be unique per destroy or
  # RDS rejects the second one, so the teardown workflow passes a timestamped
  # name and START restores from the newest resulting snapshot.
  skip_final_snapshot       = false
  final_snapshot_identifier = var.final_snapshot_identifier != "" ? var.final_snapshot_identifier : "${local.name}-final-snapshot"

  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = merge(var.tags, {
    Name = local.name
  })

  lifecycle {
    # snapshot_identifier only applies at create time, and changing it would
    # otherwise propose replacing a healthy database. final_snapshot_identifier
    # is deliberately NOT ignored: each teardown must be able to set a unique
    # name, or the second teardown fails on a duplicate snapshot.
    ignore_changes = [
      snapshot_identifier,
    ]
  }
}

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "codestorm"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  suffix = random_id.suffix.hex
  name   = "codestorm-${var.environment}"
}

# ── VPC Networking ────────────────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

# ── SQS Queue ─────────────────────────────────────────────────────────────────
resource "aws_sqs_queue" "codestorm_queue" {
  name = "${local.name}-queue"
}

# ── S3 Bucket ─────────────────────────────────────────────────────────────────
resource "aws_s3_bucket" "codestorm_bucket" {
  bucket = "${local.name}-submissions-${local.suffix}"
}

# ── ECR Repositories ──────────────────────────────────────────────────────────
resource "aws_ecr_repository" "backend" {
  name                 = "${local.name}-backend"
  force_delete         = true
}

resource "aws_ecr_repository" "worker" {
  name                 = "${local.name}-worker"
  force_delete         = true
}

# ── RDS Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "rds_sg" {
  name        = "${local.name}-rds-sg"
  description = "Allow MySQL traffic from VPC"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── RDS Database ──────────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "default" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_db_instance" "mysql" {
  identifier             = "${local.name}-db"
  allocated_storage      = 20
  storage_type           = "gp2"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  db_name                = var.db_name
  username               = var.db_user
  password               = var.db_password
  parameter_group_name   = "default.mysql8.0"
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
}

# ── EKS Cluster ───────────────────────────────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = local.name
  cluster_version = "1.30"

  cluster_endpoint_public_access  = true

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      instance_types = ["t3.micro"]
      min_size       = 1
      max_size       = 3
      desired_size   = 2
    }
  }

  enable_cluster_creator_admin_permissions = true
}

# ── SSM Parameters (To keep variables.tf valid) ───────────────────────────────
resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/codestorm/${var.environment}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
}

resource "aws_ssm_parameter" "email_user" {
  name  = "/codestorm/${var.environment}/email_user"
  type  = "String"
  value = var.email_user
}

resource "aws_ssm_parameter" "email_pass" {
  name  = "/codestorm/${var.environment}/email_pass"
  type  = "SecureString"
  value = var.email_pass
}

data "aws_caller_identity" "current" {}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "sqs_queue_url" {
  value = aws_sqs_queue.codestorm_queue.url
}
output "s3_bucket_name" {
  value = aws_s3_bucket.codestorm_bucket.id
}
output "rds_endpoint" {
  value = aws_db_instance.mysql.endpoint
}
output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}
output "ecr_worker_url" {
  value = aws_ecr_repository.worker.repository_url
}

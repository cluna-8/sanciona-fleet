# Versión de Terraform y providers. Sanciona Fleet — despliegue AWS (ADR 0003).
terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend remoto: S3 (state) + DynamoDB (lock). Descomentar y rellenar con el
  # bucket/tabla creados manualmente (no se auto-crean). El state NO se commitea:
  # contiene secretos en texto (EIP, IDs) — ver docs/deploy/AWS-RUNBOOK.md.
  #
  # backend "s3" {
  #   bucket         = "sanciona-fleet-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "eu-central-1"
  #   dynamodb_table = "sanciona-fleet-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

# Etiquetas comunes para identificar y filtrar recursos del proyecto.
locals {
  common_tags = {
    Project   = "sanciona-fleet"
    ManagedBy = "terraform"
    Repo      = "github.com/cluna-8/sanciona-fleet"
  }
}
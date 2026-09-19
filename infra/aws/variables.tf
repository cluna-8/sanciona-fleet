# Variables del módulo de infraestructura. Sanciona Fleet — AWS (ADR 0003).
#
# Los defaults sirven para `terraform plan` sin argumentos; los valores de
# producción se pasan por -var o un terraform.tfvars (NO commiteado con secretos).

variable "aws_region" {
  description = "Región AWS. EU por RGPD (Frankfurt o Irlanda)."
  type        = string
  default     = "eu-central-1" # Frankfurt
}

variable "project_name" {
  description = "Prefijo para nombrar recursos."
  type        = string
  default     = "sanciona-fleet"
}

variable "environment" {
  description = "Entorno (dev / staging / prod)."
  type        = string
  default     = "prod"
}

variable "instance_type" {
  description = "Tipo de EC2. t3.small cubre carga baja de bff-web + deadlines + Caddy."
  type        = string
  default     = "t3.small"
}

variable "ssh_cidr_blocks" {
  description = "CIDRs con acceso SSH (0.0.0.0/0 solo para dev). En prod: IPs de la oficina/VPN."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "github_org" {
  description = "Organización de GitHub para el OIDC de CI/CD (sin @)."
  type        = string
  default     = "cluna-8"
}

variable "github_repo" {
  description = "Repo de GitHub autorizado a asumir el rol de despliegue."
  type        = string
  default     = "sanciona-fleet"
}

variable "domain_name" {
  description = "Dominio público de la plataforma (apuntado en Cloudflare, ver Parte 4)."
  type        = string
  default     = "sancionafleet.fexia.es"
}
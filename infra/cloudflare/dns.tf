# DNS en Cloudflare para Sanciona Fleet. Registra el dominio apuntando a la EIP
# de la EC2. Requiere un token de Cloudflare en la var de entorno
# CLOUDFLARE_API_TOKEN (no en el repo). El dominio debe estar ya añadido a
# Cloudflare (gestión humana). Ver docs/deploy/DNS-TLS.md.

terraform {
  required_version = ">= 1.7"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  description = "Token de Cloudflare (permisos Zone:DNS:Edit). No commitear."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Zone ID de Cloudflare del dominio (se ve en el panel de la zona)."
  type        = string
}

variable "domain_name" {
  description = "Subdominio completo (app.sanciona-fleet.com)."
  type        = string
  default     = "app.sanciona-fleet.com"
}

variable "ec2_public_ip" {
  description = "EIP de la EC2 (output de infra/aws). Pasar con -var."
  type        = string
}

# Registro A apuntando a la EC2, con proxy de Cloudflare (orange cloud) activo.
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  value   = var.ec2_public_ip
  type    = "A"
  proxied = true
  comment = "Sanciona Fleet — bff-web (ADR 0003). Gestionado por Terraform."
}

# TLS: modo Full (strict) entre Cloudflare y el origen (Caddy con Let's Encrypt).
resource "cloudflare_zone_settings_override" "tls" {
  zone_id = var.cloudflare_zone_id
  settings {
    ssl_mode           = "full"
    always_use_https   = true
    min_tls_version    = "1.2"
    tls_1_3            = "on"
  }
}
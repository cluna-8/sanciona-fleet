# Secrets en SSM Parameter Store (SecureString). Los parámetros se crean
# vacíos/placeholder aquí para reservar el nombre y el ARN; las claves reales
# se escriben a mano (o desde CI) y NUNCA en el repo. Ver docs/deploy/AWS-RUNBOOK.md.
#
# El contenedor bff-web los lee desde apps/bff-web/.env, que en producción se
# genera a partir de estos parámetros (ver scripts/inject-secrets.sh).

locals {
  # Lista de parámetros de configuración (texto plano). Los valores que aquí
  # figuran como PENDIENTE-RELLENAR reservan el nombre del parámetro; el valor
  # real se escribe después con scripts/inject-secrets.sh (SSM rechaza valores
  # vacíos, por eso no se usa "").
  params = {
    SUPABASE_URL                  = "PENDIENTE-RELLENAR"
    SUPABASE_PUBLISHABLE_KEY      = "PENDIENTE-RELLENAR"
    VITE_SUPABASE_URL             = "PENDIENTE-RELLENAR"
    VITE_SUPABASE_PUBLISHABLE_KEY = "PENDIENTE-RELLENAR"
    VITE_SUPABASE_PROJECT_ID      = "PENDIENTE-RELLENAR"
    IA_PROVEEDOR                  = "openrouter"
    IA_URL_BASE                   = "https://openrouter.ai/api/v1/chat/completions"
    IA_MODELO_EXTRACCION          = "PENDIENTE-RELLENAR"
    IA_MODELO_ANALISIS            = "PENDIENTE-RELLENAR"
    IA_TIMEOUT_MS                 = "120000"
    DEADLINES_SERVICE_URL         = "http://deadlines-service:8787"
    RESEND_API_KEY                = "PENDIENTE-RELLENAR"
    EMAIL_FROM                    = "PENDIENTE-RELLENAR"
    PUBLIC_SITE_URL               = "https://${var.domain_name}"
  }

  # Parámetros secretos (SecureString). Valor vacío: rellenar a mano.
  secret_params = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "IA_API_KEY",
  ]
}

resource "aws_ssm_parameter" "config" {
  for_each    = tomap(local.params)
  name        = "/${var.project_name}/${var.environment}/${each.key}"
  type        = "String"
  value       = each.value
  description = "Configuración de ${var.project_name} (${var.environment})"
  tags        = local.common_tags
  # El valor real lo escribe scripts/fill-ssm.sh / inject-secrets.sh fuera de
  # Terraform; que TF no lo revertiria a PENDIENTE-RELLENAR en el proximo plan.
  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "secret" {
  for_each    = toset(local.secret_params)
  name        = "/${var.project_name}/${var.environment}/${each.value}"
  type        = "SecureString"
  value       = "PENDIENTE-RELLENAR"
  description = "Secreto de ${var.project_name} (${var.environment}) — no commitear"
  tags        = local.common_tags
  lifecycle {
    ignore_changes = [value]
  }
}
# Salidas para usarlas fuera de Terraform (DNS en Cloudflare, CI, runbook).

output "instance_public_ip" {
  description = "IP pública (EIP) de la EC2. Apuntar el registro A de Cloudflare aquí."
  value       = aws_eip.main.public_ip
}

output "instance_id" {
  description = "ID de la instancia EC2 (para SSM Run Command desde CI)."
  value       = aws_instance.main.id
}

output "ecr_bff_web_url" {
  description = "URL del repositorio ECR de bff-web."
  value       = aws_ecr_repository.bff_web.repository_url
}

output "ecr_deadlines_url" {
  description = "URL del repositorio ECR de deadlines-service."
  value       = aws_ecr_repository.deadlines_service.repository_url
}

output "github_deploy_role_arn" {
  description = "ARN del rol que GitHub Actions asume por OIDC para desplegar."
  value       = aws_iam_role.github_deploy.arn
}

output "ssm_parameter_prefix" {
  description = "Prefijo de los parámetros en SSM (con barra final)."
  value       = "/${var.project_name}/${var.environment}/"
}
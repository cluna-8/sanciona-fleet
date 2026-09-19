# Infraestructura de Sanciona Fleet

Despliegue en **AWS (EC2 + Docker)** con dominio en **Cloudflare** y reverse
proxy **Caddy** con TLS automático. Todo como código, en este directorio. Ver
ADR 0003 y `docs/deploy/AWS-RUNBOOK.md`.

```
infra/
├── aws/             Terraform: VPC, EC2 (t3.small), ECR, SSM, IAM OIDC, EIP
│   ├── versions.tf  Provider AWS + backend S3 (comentado)
│   ├── variables.tf Variables (región EU, tipo EC2, dominio, repo GitHub)
│   ├── vpc.tf       VPC + subred pública + IGW
│   ├── sg.tf        Security groups (80/443 abiertos, SSH restringido)
│   ├── ec2.tf      + user_data.sh: instala Docker + Caddy, clona el repo
│   ├── ecr.tf       Repos ECR de bff-web y deadlines-service
│   ├── ssm.tf       Secrets en SSM Parameter Store (SecureString)
│   ├── iam.tf       Rol EC2 (SSM + ECR) y rol OIDC de GitHub Actions
│   └── outputs.tf   EIP, ECR, rol ARN, prefijo SSM
├── cloudflare/dns.tf  Terraform: registro A → EIP + TLS Full (strict)
└── caddy/Caddyfile    Reverse proxy + Let's Encrypt + cabeceras de seguridad
```

## Coste objetivo

~15–25 €/mes: t3.small + EIP + S3 (state) + ancho de banda bajo. Sin NAT, sin
RDS, sin LB (Caddy en la propia EC2 hace terminación TLS).

## Prerrequisitos (gestión humana, una sola vez)

1. **Cuentas de organización compartidas** (GitHub Org, AWS, Cloudflare,
   Supabase Org) con Cristian y Jorge como admins. Ver `TAREAS-CRISTIAN.md`
   Bloque 2.
2. **Dominio** registrado y añadido a Cloudflare. Obtener `zone_id`.
3. **Token de Cloudflare** (permisos `Zone:DNS:Edit`).
4. **Bucket S3 + tabla DynamoDB** para el state de Terraform (o usar local para
   empezar, sin commitear el `.terraform/` ni `terraform.tfstate`).
5. **OIDC de GitHub** en AWS IAM: crear el proveedor
   `token.actions.githubusercontent.com` (lo hace el primer `terraform apply` si
   no existe; si ya existe, se referencia). El rol está en `iam.tf`.

## Aplicar

```sh
# 1. Infra AWS
cd infra/aws
terraform init
terraform plan  -var domain_name=sancionafleet.fexia.es
terraform apply -var domain_name=sancionafleet.fexia.es
# outputs: instance_public_ip, ecr_*, github_deploy_role_arn, ssm_parameter_prefix

# 2. Rellenar secrets en SSM (no en el repo)
aws ssm put-parameter --name "/sanciona-fleet/prod/SUPABASE_SERVICE_ROLE_KEY" \
  --type SecureString --value "<clave>" --overwrite
aws ssm put-parameter --name "/sanciona-fleet/prod/IA_API_KEY" \
  --type SecureString --value "<clave-openrouter>" --overwrite
# ... y los de configuración que no tengan default correcto (IA_MODELO_*, etc.)

# 3. DNS en Cloudflare (usar la EIP del paso 1)
cd ../cloudflare
terraform init
terraform apply -var cloudflare_api_token=... -var cloudflare_zone_id=... \
  -var ec2_public_ip=<instance_public_ip> -var domain_name=sancionafleet.fexia.es
```

## Quiero cambiar algo

- **Más barato**: bajar a `t3.micro` (puede ir justo con 3 contenedores). Se
  cambia `instance_type` y `terraform apply`.
- **Más robusto**: subir a `t3.medium`, o pasar a 2 EC2 + ALB (rompe el "fácil y
  barato"). Documentar antes en un ADR nuevo.
- **Otra región**: `aws_region` (mantener EU por RGPD).

## No va aquí

- El `docker-compose.prod.yml` vive en la raíz del repo (se ejecuta en la EC2).
- Los scripts de despliegue (`scripts/deploy-remote.sh`, `inject-secrets.sh`,
  `reload-caddy.sh`) viven en `scripts/`.
- Los runbooks detallados en `docs/deploy/`.

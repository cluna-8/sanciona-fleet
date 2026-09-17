# DNS y TLS — Sanciona Fleet

Cómo queda el dominio y el TLS en producción. Resumen: **Cloudflare** en el
borde (DNS + TLS edge) → **Caddy** en la EC2 (reverse proxy + certificado
Let's Encrypt al origen). Sin gestor de certificados aparte; Caddy renueva solo.

Ver `infra/cloudflare/dns.tf`, `infra/caddy/Caddyfile` y ADR 0003.

## Topología

```
usuario ──HTTPS──▶ Cloudflare (proxy naranja, TLS edge, Full strict)
                        │
                        └──HTTPS──▶ EC2 :443  Caddy (cert Let's Encrypt)
                                            │
                                            └──▶ 127.0.0.1:8080  bff-web (SSR)
```

- **Cloudflare** termina el TLS del navegador y reenvía al origen por HTTPS
  (modo `full`). El certificado de origen lo emite Caddy con Let's Encrypt.
- **Caddy** escucha en 80/443, pide el certificado por desafío HTTP-01 (el
  puerto 80 pasa por el proxy de Cloudflare, que es compatible), y hace de
  reverse proxy al contenedor `bff-web` publicado en `127.0.0.1:8080`.
- El registro A está **proxied** (orange cloud): la IP de la EC2 no se expone.

## Pasos (una sola vez, por orden)

1. **Dominio en Cloudflare.** El dominio (`sanciona-fleet.com` o el que sea)
   debe estar ya añadido a Cloudflare como zona activa. Obtener el `zone_id`
   (panel de la zona → Overview → API).

2. **Token de Cloudflare.** Crear un token con permiso `Zone:DNS:Edit` (y
   `Zone:Settings:Edit` para `cloudflare_zone_settings_override`) sobre esa
   zona. Guardarlo fuera del repo (1Password / `AWS_SECRET` / variable de CI).

3. **Terraform AWS primero.** `cd infra/aws && terraform apply`. Anotar el
   output `instance_public_ip` (la EIP).

4. **Terraform Cloudflare.**

   ```sh
   cd infra/cloudflare
   terraform init
   terraform apply \
     -var cloudflare_api_token=<token> \
     -var cloudflare_zone_id=<zone_id> \
     -var ec2_public_ip=<instance_public_ip> \
     -var domain_name=app.sanciona-fleet.com
   ```

   Crea el registro A (proxied) y fuerza TLS Full + always_use_https + min TLS
   1.2 + TLS 1.3.

5. **Primer arranque de Caddy.** El `user_data.sh` ya copia el `Caddyfile` con
   `__DOMAIN__` sustituido y arranca Caddy. En el primer arranque Caddy pide el
   certificado a Let's Encrypt. Si Cloudflare está en modo `full` y el registro
   ya apunta, tarda segundos. Verificar:
   ```sh
   curl -I https://app.sanciona-fleet.com/health   # 200 ok
   ```

## Rotación / renovación

- **Let's Encrypt**: Caddy renueva solo (validez 90 días, renueva a los 30). No
  hace falta cron ni `certbot`.
- **Cloudflare edge cert**: lo gestiona Cloudflare. No action.
- Si se cambia el dominio: editar `domain_name` y volver a aplicar los dos
  Terraform. Caddy recoge el nuevo dominio al recargar (`reload-caddy.sh`).

## Troubleshooting

| Síntoma                                        | Causa probable                 | Acción                                                                              |
| ---------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `curl` al dominio va a Cloudflare pero 521/522 | Caddy no responde en EC2       | `ssh`, `systemctl status caddy`, comprobar que el `Caddyfile` tiene el dominio bien |
| 525 / `SSL handshake failed`                   | Caddy aún no tiene certificado | esperar al primer challenge; revisar que el puerto 80 llega (SG de AWS)             |
| 404 en `/health`                               | bff-web no levantado           | `docker compose -f docker-compose.prod.yml ps` en la EC2                            |
| El registro A muestra la IP real               | proxy desactivado              | `proxied = true` en `dns.tf` (ya lo está)                                           |

## Cumplimiento (RGPD)

- TLS 1.2 mínimo en el edge y en el origen (forzado por Terraform + Caddy).
- HSTS mandado por Caddy (`max-age=31536000; includeSubDomains`).
- Sin terceros en la página salvo Supabase (auth/datos) y OpenRouter (IA, solo
  backend, no sale del navegador). Ver `docs/compliance/README.md`.

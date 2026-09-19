# DNS y TLS — Sanciona Fleet

Cómo queda el dominio y el TLS en producción. Resumen: **Cloudflare** gestiona
el DNS del dominio; el registro A es **DNS-only** (sin proxy naranja), de modo
que **Caddy** en la EC2 termina el TLS del navegador directamente con un
certificado de Let's Encrypt. Sin gestor de certificados aparte; Caddy renueva
solo.

> En producción real (19 sep 2026): `sancionafleet.fexia.es` → EIP
> `63.181.51.42`, registro A DNS-only, Caddy sirve HTTPS con cert de Let's
> Encrypt. El dominio documentado antes (`app.sanciona-fleet.com`) era el
> placeholder; el real es `sancionafleet.fexia.es`.

Ver `infra/cloudflare/dns.tf`, `infra/caddy/Caddyfile` y ADR 0003.

## Topología

```
usuario ──HTTPS──▶ EC2 :443  Caddy (cert Let's Encrypt, HTTP-01 en :80)
                            │
                            └──▶ 127.0.0.1:8080  bff-web (SSR)
                            └──▶ 127.0.0.1:8787  deadlines-service (interno)
```

- **Cloudflare** solo gestiona el DNS del dominio (registro A DNS-only,
  `proxied=false`). La IP de la EC2 es pública (es la EIP). Para activar el
  proxy naranja (ocultar la IP, WAF, TLS edge) hace falta ampliar el token a
  `Zone:Settings:Edit` y reactivar `cloudflare_zone_settings_override`; ver
  `infra/cloudflare/dns.tf`.
- **Caddy** escucha en 80/443, pide el certificado por desafío HTTP-01 (el
  puerto 80 llega directo al origen) y hace de reverse proxy al contenedor
  `bff-web` publicado en `127.0.0.1:8080`.

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
     -var domain_name=sancionafleet.fexia.es
   ```

   Crea el registro A DNS-only (`proxied=false`) apuntando a la EIP. El token
   de Cloudflare solo tiene `Zone:DNS:Edit`; para forzar TLS edge y min TLS
   1.2/1.3 haría falta `Zone:Settings:Edit` (ver `infra/cloudflare/dns.tf`).

5. **Primer arranque de Caddy.** El `user_data.sh` ya copia el `Caddyfile` con
   `__DOMAIN__` sustituido y arranca Caddy. En el primer arranque Caddy pide el
   certificado a Let's Encrypt por HTTP-01. Si el registro A ya apunta a la
   EIP, tarda segundos. Verificar:
   ```sh
   curl -I https://sancionafleet.fexia.es/health   # 200 ok
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
| El registro A muestra la IP real               | DNS-only por diseño            | `proxied = false` en `dns.tf` (intencionado; activar proxy naranja amplía el token) |

## Cumplimiento (RGPD)

- TLS 1.2 mínimo en el edge y en el origen (forzado por Terraform + Caddy).
- HSTS mandado por Caddy (`max-age=31536000; includeSubDomains`).
- Sin terceros en la página salvo Supabase (auth/datos) y OpenRouter (IA, solo
  backend, no sale del navegador). Ver `docs/compliance/README.md`.

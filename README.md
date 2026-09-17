# Sanciona Fleet

Repositorio: [github.com/cluna-8/sanciona-fleet](https://github.com/cluna-8/sanciona-fleet) (privado).

Gestión de expedientes sancionadores para empresas españolas de transporte de
mercancías por carretera. Recibe la notificación de la multa, extrae los datos
con IA, calcula los plazos legales con un motor determinista, ofrece un análisis
preliminar y ayuda a redactar alegaciones y recursos **con validación humana
obligatoria**.

> No es una herramienta de asesoramiento jurídico automatizado. Todo análisis y
> borrador generado por IA es un apoyo que un profesional debe revisar y validar.

## Documentación

| Documento | Qué es |
|---|---|
| [`SPEC.md`](SPEC.md) | **Fuente de verdad.** Qué debe hacer el sistema. El código se revisa contra él |
| [`TAREAS-CRISTIAN.md`](TAREAS-CRISTIAN.md) | Decisiones y gestiones humanas pendientes |
| [`docs/adr/`](docs/adr/) | Decisiones de arquitectura y su porqué (0003 = despliegue AWS) |
| [`docs/compliance/README.md`](docs/compliance/README.md) | RGPD, DPAs, validación jurídica del motor de plazos |
| [`docs/legacy/INVENTARIO-AS-IS.md`](docs/legacy/INVENTARIO-AS-IS.md) | Diagnóstico del prototipo de Lovable del que nace todo |
| [`docs/spec/06-arquitectura-bff-web.md`](docs/spec/06-arquitectura-bff-web.md) | Qué hace el frontend y cómo está construido por dentro |
| [`infra/README.md`](infra/README.md) | Infra como código: Terraform AWS + Cloudflare + Caddy |
| [`docs/deploy/AWS-RUNBOOK.md`](docs/deploy/AWS-RUNBOOK.md) | Cómo llevar el stack a producción en AWS |
| [`docs/deploy/CI-CD.md`](docs/deploy/CI-CD.md) · [`DNS-TLS.md`](docs/deploy/DNS-TLS.md) · [`DATABASE.md`](docs/deploy/DATABASE.md) | CI/CD, dominio/TLS y base de datos |

## Estructura

```
apps/bff-web              Frontend en desarrollo activo (TanStack Start). Nace
                          como copia de multas-export/, sin acoplamiento a Lovable
packages/contracts        Tipos compartidos entre servicios. Un cambio de forma
                          es un error de compilación, no un bug en producción
packages/ai-provider      Interfaz única de IA, con proveedor intercambiable
                          (Google/OpenAI/Anthropic/OpenRouter; por defecto OpenRouter)
services/deadlines-service   Motor de plazos determinista (Bun HTTP en prod)
infra/                    Infra como código: Terraform AWS (EC2+ECR+SSM+OIDC) +
                          Cloudflare (DNS/TLS) + Caddy
scripts/                  db/migrar.ts, deploy-remote.sh, inject-secrets.sh
multas-export/            Espejo de solo lectura del export de Lovable. No se
                          edita ni se despliega — ver docs/legacy/CAMBIOS-LOVABLE.md
```

Plan de refactor completo (deuda técnica, estructura objetivo, 4 etapas):
[`docs/refactor/PLAN-REFACTOR-FRONTEND.md`](docs/refactor/PLAN-REFACTOR-FRONTEND.md).

Método: **spec-driven**. La migración del prototipo sigue una estrategia
*strangler fig* (SPEC.md §7.5): se extrae un servicio cada vez, sin reescritura
de golpe.

## Desarrollo

```sh
bun install
bun test                 # toda la suite
bunx tsc --noEmit        # dentro de cada paquete
```

Requiere [Bun](https://bun.sh). El lockfile es de texto y hay una guardia de
supply-chain de 24 h configurada en `bunfig.toml`.

### Levantar todo en local (Docker)

```sh
cp apps/bff-web/.env.example apps/bff-web/.env   # rellenar con credenciales de Supabase
docker compose up -d --build
# bff-web       http://localhost:8080
# deadlines     http://localhost:8787
```

## Estado

| Pieza | Estado |
|---|---|
| Especificación funcional | v0.3 — 12 decisiones de producto pendientes (SPEC.md) |
| `apps/bff-web` | Sin acoplamiento a Lovable, capa de datos modularizada por feature. Verificado con Docker real (alta de cuenta, login, panel de control) |
| `deadlines-service` | Funcional, 16 tests. **Pendiente de validación jurídica** |
| `ai-provider` | Funcional, 31 tests |
| Resto de servicios | No empezados — sus features ya están aisladas en `apps/bff-web` para extraerlas (ver `docs/spec/06-arquitectura-bff-web.md`) |
| Despliegue | Local con Docker, verificado. **Prod: AWS EC2 + Caddy + Cloudflare + OpenRouter** (ADR 0003). Infra y CI/CD listos; falta aplicar (credenciales). Ver `docs/deploy/AWS-RUNBOOK.md` |

## Licencia

Privado. Todos los derechos reservados.

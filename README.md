# Sanciona Fleet

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
| [`docs/adr/`](docs/adr/) | Decisiones de arquitectura y su porqué |
| [`docs/legacy/INVENTARIO-AS-IS.md`](docs/legacy/INVENTARIO-AS-IS.md) | Diagnóstico del prototipo de Lovable del que nace todo |

## Estructura

```
apps/bff-web              Frontend en desarrollo activo (TanStack Start). Nace
                          como copia de multas-export/, sin acoplamiento a Lovable
packages/contracts        Tipos compartidos entre servicios. Un cambio de forma
                          es un error de compilación, no un bug en producción
packages/ai-provider      Interfaz única de IA, con proveedor intercambiable
services/deadlines-service   Motor de plazos determinista (Worker)
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

## Estado

| Pieza | Estado |
|---|---|
| Especificación funcional | v0.2 — 10 decisiones de producto pendientes |
| `deadlines-service` | Funcional, 16 tests. **Pendiente de validación jurídica** |
| `ai-provider` | Funcional, 31 tests |
| Resto de servicios | No empezados |
| Despliegue | No configurado |

## Licencia

Privado. Todos los derechos reservados.

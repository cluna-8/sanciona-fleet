# deadlines-service

Motor de plazos determinista de Sanciona Fleet, extraído del monolito
(`multas-export/src/lib/plazos.ts`) como el primer microservicio — ver
`SPEC.md` §7 (arquitectura) y §7.5 (estrategia de migración).

**Por qué este fue el primero:** es lógica pura (sin IA, sin base de datos,
sin llamadas externas), la más definida del proyecto, y la de mayor
consecuencia legal si se calcula mal. Aislarla primero fija el patrón
(contrato compartido + servicio + tests) que se repite para el resto.

## Desarrollo local

```sh
bun install          # desde la raíz del monorepo (instala todos los workspaces)
cd services/deadlines-service
bun run dev           # levanta el Worker en http://localhost:8787
bun test              # 16 tests unitarios sobre las reglas de plazo
bun run typecheck
```

## API

- `GET /health` — comprobación de vida.
- `POST /calcular` — body: `{ sanction_id, entrada }` (ver
  `packages/contracts/src/deadlines.ts` para la forma exacta de `entrada`).
  Devuelve `{ sanction_id, plazos, calculado_en }`.
- **RPC** (`DeadlinesService.calcular`) — para cuando otro Worker de Cloudflare
  lo invoque por *service binding* en producción, sin salir a la red pública.

## Quién lo consume hoy

`multas-export` (el monolito/bff-web) ya no calcula plazos localmente: llama a
este servicio desde `src/lib/deadlines-client.server.ts`, vía la variable de
entorno `DEADLINES_SERVICE_URL` (por defecto `http://localhost:8787` en
desarrollo). Para que el alta de expedientes funcione en local, **este
servicio debe estar corriendo** antes de crear o recalcular plazos.

## ⚠️ Antes de producción

Las reglas de plazo (20 días naturales tráfico, 15 hábiles transporte, 1 mes
recurso, festivos solo nacionales fijos) están pendientes de **validación por
un abogado administrativista** — ver `SPEC.md` §8 y Bloque 4 de
`TAREAS-CRISTIAN.md`. Cualquier cambio en `src/plazos.ts` debe ir acompañado
de la actualización de `test/plazos.test.ts` en el mismo commit.

# @sanciona/ai-provider

Punto único por el que el sistema habla con un modelo de IA.

Sustituye la llamada directa a `ai.gateway.lovable.dev` que hacía el monolito
(**bloqueador #1** del inventario) por una interfaz con proveedor
intercambiable. Lo consumen `extraction-service`, `analysis-service` y
`drafts-service` (SPEC.md §7.1).

## Uso

```ts
import { crearProveedorDesdeEntorno } from "@sanciona/ai-provider";

const ia = crearProveedorDesdeEntorno(env);

const { campos, avisos, modelo } = await ia.extraer({ documento });
const analisis = await ia.analizar({ contexto, fuentes });
const { contenido } = await ia.redactar({ tipo: "Alegaciones", contexto, fuentes });
```

## Configuración

| Variable | Obligatoria | Por defecto | Notas |
|---|:---:|---|---|
| `IA_API_KEY` | sí | — | Clave del proveedor. **Secreto** (`wrangler secret put`) |
| `IA_PROVEEDOR` | no | `google` | `google` · `openai` · `anthropic` · `openai-compatible` |
| `IA_MODELO_EXTRACCION` | no | `gemini-3.7-flash` | Debe admitir entrada multimodal (PDF/imagen) |
| `IA_MODELO_ANALISIS` | no | `gemini-3.7-flash` | |
| `IA_URL_BASE` | no | — | Solo para `openai-compatible` (OpenRouter, etc.) |
| `IA_TIMEOUT_MS` | no | `120000` | Un PDF escaneado grande tarda |

El valor por defecto es Gemini a propósito: es el modelo que ya usaba el
monolito a través de Lovable, así que la migración cambia quién factura sin
cambiar a la vez la calidad de la salida.

## Diseño

- **Los tipos viven en `@sanciona/contracts`**, no aquí. La forma de los datos
  es del dominio, no del vendedor de modelos: cambiar de Google a OpenAI no
  toca ni un tipo.
- **`ProveedorBase` implementa el flujo** (extraer/analizar/redactar) y cada
  proveedor solo implementa `completar()`, que es lo único que cambia entre
  vendedores.
- **Los prompts son lógica de negocio, no configuración.** Cada regla evita un
  fallo con consecuencia legal concreta. No editar sin revisión jurídica.
- **Errores con código estable** (`ErrorIA.codigo`), independientes del status
  HTTP de cada proveedor. La UI reacciona al código, nunca al texto.
- **Fallbacks conservadores:** ante una salida inválida se elige siempre el
  valor más cauto (`Gris`, `Bajo`, `Revisar`), nunca el más optimista.

## Tests

```sh
bun test
```

31 tests, sin salir a la red: `fetch` se simula. Cubren los fallbacks, el
rescate de JSON envuelto en texto, la traducción de errores HTTP y que el
detalle técnico (que puede contener la API key) nunca llega al mensaje de
usuario.

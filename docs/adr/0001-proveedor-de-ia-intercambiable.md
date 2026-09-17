# ADR 0001 — Proveedor de IA intercambiable

- **Estado:** aceptado
- **Fecha:** 2026-09-09
- **Contexto:** SPEC.md §7.1 y §7.5 (paso 2), inventario §7.2 (bloqueador #1)

## Contexto

El monolito heredado de Lovable llamaba directamente a
`https://ai.gateway.lovable.dev/v1/chat/completions` con `LOVABLE_API_KEY`,
ambos hardcodeados en `src/lib/expediente.server.ts`. Consecuencias:

1. **Las tres capacidades de IA del producto** —extracción documental, análisis
   del expediente y redacción de escritos— dejan de funcionar fuera de Lovable.
   Es decir, el diferencial del producto depende de un tercero.
2. El consumo se factura contra los créditos del workspace de Lovable, que
   pertenece a otra persona (`jlinares_10`).
3. El código traducía errores propios de esa pasarela (402 "añade créditos",
   403 "deshabilitado en este espacio de trabajo"), acoplando incluso los
   mensajes de usuario al proveedor.

## Decisión

Se extrae toda la interacción con modelos a `packages/ai-provider`, con una
interfaz única `ProveedorIA` de tres métodos: `extraer()`, `analizar()` y
`redactar()`.

- Los **tipos de datos viven en `@sanciona/contracts`**, no en el paquete del
  proveedor: la forma de los datos pertenece al dominio.
- Se implementan cuatro adaptadores: **Google** (nativo), **OpenAI**,
  **Anthropic** y **openai-compatible** (OpenRouter y cualquier pasarela que
  hable ese dialecto, incluida la de Lovable).
- El proveedor se elige por variable de entorno `IA_PROVEEDOR`, con `google`
  por defecto y `gemini-3.7-flash` como modelo, que es lo que ya se usaba.
- Los errores se exponen con un **código estable del dominio** (`sin_credito`,
  `no_autorizado`, `limite_peticiones`…), no con el status HTTP del vendedor.

## Consecuencias

**A favor**

- Se elimina el bloqueador #1: el producto ya puede desplegarse fuera de Lovable.
- Cambiar de proveedor es una variable de entorno, no un cambio de código.
- Los tres servicios que usarán IA comparten una sola forma de datos, validada.
- La salida del modelo se normaliza en un único sitio, con fallbacks
  conservadores: un modelo que devuelve basura produce "Gris / Bajo / Revisar",
  nunca un falso "Verde".
- Se puede comparar la salida de dos proveedores apuntando `IA_URL_BASE` a la
  pasarela antigua durante la migración.

**En contra**

- Una capa de indirección más que mantener.
- Cada adaptador debe seguir los cambios de API de su vendedor.
- Los prompts pasan a ser compartidos por los tres servicios: un cambio afecta a
  todos. Es deliberado —las salvaguardas jurídicas deben ser idénticas en los
  tres— pero exige revisión jurídica centralizada.

## Pendiente

- **Contrato de encargado de tratamiento (DPA)** con el proveedor que se elija
  (por defecto **OpenRouter**, ADR 0003): se le envían documentos con datos
  personales de conductores (nombre, DNI). Verificar además que no entrena con
  los datos enviados y que la cláusula cubre a los modelos subyacentes de
  terceros. Estado y acciones en `docs/compliance/README.md` §1.

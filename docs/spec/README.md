# Documentación de Sanciona Fleet

Mapa de qué documento responde a qué pregunta. Si es tu primer contacto con el
proyecto, léelos en el orden de la tabla.

| # | Documento | Responde a | Léelo si… |
|:--:|---|---|---|
| 1 | [`01-glosario.md`](01-glosario.md) | ¿Qué significan "expediente", "régimen sancionador", "reducción del 50 %"? | Es tu primer contacto. **Sin esto, el resto no se entiende.** |
| 2 | [`02-flujos.md`](02-flujos.md) | ¿Cómo circula una multa por el sistema, de principio a fin? | Quieres el panorama antes que el detalle |
| 3 | [`../../SPEC.md`](../../SPEC.md) | ¿Qué debe hacer el sistema? | Vas a construir o revisar algo. **Es la fuente de verdad** |
| 4 | [`03-casos-uso.md`](03-casos-uso.md) | ¿Cómo sé que un requisito está bien resuelto? | Vas a implementar, probar o aceptar trabajo |
| 5 | [`04-modelo-datos.md`](04-modelo-datos.md) | ¿Qué entidades hay y qué reglas nunca se rompen? | Tocas base de datos o escribes queries |
| 6 | [`05-trazabilidad.md`](05-trazabilidad.md) | ¿Qué está hecho, qué falta y dónde vive cada cosa? | Quieres saber el estado real del proyecto |
| 6b | [`06-arquitectura-bff-web.md`](06-arquitectura-bff-web.md) | ¿Qué hace `apps/bff-web` y cómo está construido por dentro? | Vas a tocar el frontend, o quieres entenderlo sin leer código |
| 7 | [`../adr/`](../adr/) | ¿Por qué se decidió así y no de otra forma? | Vas a cambiar una decisión estructural |
| 8 | [`../legacy/INVENTARIO-AS-IS.md`](../legacy/INVENTARIO-AS-IS.md) | ¿Qué había antes y qué estaba roto? | Necesitas el contexto de una decisión |
| 9 | [`../legacy/CAMBIOS-LOVABLE.md`](../legacy/CAMBIOS-LOVABLE.md) | ¿Qué se ha tocado en el prototipo desde la última vez? | Vuelves después de unos días |
| 10 | [`../../TAREAS-CRISTIAN.md`](../../TAREAS-CRISTIAN.md) | ¿Qué depende de una persona y no del código? | Eres Cristian, o quieres saber qué bloquea |

## Cómo funciona el método

**Spec-driven**: la especificación va delante del código, no detrás.

```
inventario ──► SPEC.md ──► casos de uso ──► código ──► tests
 (qué había)   (qué debe    (cómo sé que    (cómo)    (lo demuestran)
               hacer)       está bien)
```

Tres reglas prácticas:

1. **Todo requisito tiene identificador.** `RF-PLAZO-3`, `RS-2`, `RF-ALTA-2`.
   Sirve para hablar sin ambigüedad y para rastrear.
2. **Todo commit que implementa un requisito lo cita** en su mensaje. Así
   `git log --grep=RF-PLAZO` responde "¿qué se ha hecho de esto?".
3. **La spec cambia antes que el código, no después.** Si al construir aparece
   algo que la spec no previó, se actualiza la spec (subiendo versión) y luego
   se construye. Un código que contradice la spec es un bug de uno de los dos.

## Estado y convenciones

- `[EXISTENTE]` — ya funciona así en el prototipo; se conserva.
- `[NUEVO]` — corrige un hallazgo del inventario o añade capacidad.
- 🟡 **DECISIÓN PENDIENTE** — necesita una respuesta humana. Lleva siempre una
  recomendación por defecto, para que la falta de respuesta no bloquee.
- ⚠️ — riesgo legal o de seguridad. No se pasa por alto en una revisión.

## Advertencia permanente

Este producto ayuda a decidir sobre sanciones administrativas con plazos legales
reales. **Un error de cálculo le cuesta dinero a un transportista.** De ahí dos
reglas que no se negocian:

- El motor de plazos es **determinista y sin IA**, y sus reglas requieren
  validación de un abogado administrativista antes de la v1 pública.
- Todo lo que genera un modelo —extracción, análisis, borradores— es un apoyo
  que **un humano revisa y valida**. Nunca una decisión automática.

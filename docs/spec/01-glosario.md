# Glosario del dominio

Para entender Sanciona Fleet hay que entender primero cómo funciona una multa a
una empresa de transporte en España. Este documento explica el vocabulario que
usan el código, la base de datos y el resto de la especificación.

> ⚠️ **Esto es material de apoyo para entender el producto, no asesoramiento
> jurídico.** Las reglas concretas de plazo que aplica el sistema están
> pendientes de validación por un abogado administrativista (SPEC.md §3.4).
> Las normas citadas son las que el propio sistema tiene cargadas como fuentes
> verificadas en la tabla `legal_sources`.

---

## 1. El expediente y su recorrido

| Término | Qué es | Por qué importa aquí |
|---|---|---|
| **Expediente sancionador** | El procedimiento administrativo completo, desde que la Administración denuncia un hecho hasta que la sanción es firme o se archiva. | Es la entidad central del sistema: la tabla `sanctions`. Todo cuelga de ella. |
| **Denuncia** | El acto por el que un agente o un aparato (radar, báscula) constata el hecho. | Da lugar al expediente. Su fecha (`complaint_date`) **no** es la que abre los plazos. |
| **Notificación** | El acto formal por el que la Administración comunica la denuncia al interesado, con acuse de recibo. | **El dato más importante del sistema.** Casi todos los plazos se cuentan desde aquí (`notification_date`). |
| **Fecha de emisión** | Cuándo se redactó el documento. | ⚠️ **Nunca se calcula un plazo desde aquí.** Entre emisión y notificación pueden pasar semanas. El motor se niega explícitamente a usarla. |
| **Fecha de recepción** | Cuándo llegó materialmente a la empresa. | Sustituto de la notificación cuando esta no consta (`reception_date`). |
| **Sanción firme** | La que ya no admite recurso ordinario. | A partir de ahí solo queda pagar o ir a la vía judicial. |
| **Titular** | La empresa a cuyo nombre está el vehículo. | Es quien recibe la notificación, aunque no condujera. De ahí la obligación de identificar al conductor. |

## 2. Los dos regímenes — la distinción que lo condiciona todo

Una empresa de transporte recibe multas de **dos mundos jurídicos distintos**,
con plazos, reducciones y órganos diferentes. Confundirlos es el error más caro
que puede cometer el sistema, y por eso los prompts de IA lo prohíben
expresamente y el motor de plazos los trata por separado.

| | **Régimen de Tráfico** | **Régimen de Transporte** |
|---|---|---|
| **Quién sanciona** | DGT, Guardia Civil de Tráfico, ayuntamientos | Ministerio de Transportes, inspección de transporte, comunidades autónomas |
| **Qué castiga** | Cómo se circula: velocidad, estacionamiento, señalización, ZBE | Cómo se ejerce la actividad: tacógrafo, tiempos de conducción, pesos, autorizaciones, ADR |
| **Norma principal** | RDL 6/2015 (Ley de Tráfico) | Ley 16/1987 (LOTT) + Reglamentos (CE) 561/2006 y (UE) 165/2014 |
| **Reducción por pronto pago** | Sí, del 50 % (art. 94) | No se presupone; depende del procedimiento |
| **Importes típicos** | 90–600 € | 400–4.000 € y más |

Cómo lo detecta el sistema hoy: por **palabras clave en el nombre del organismo**
(`dgt`, `guardia civil`, `tráfico`, `ayuntamiento` → Tráfico; `transporte`,
`ministerio`, `inspección` → Transporte). Es frágil, y por eso SPEC.md §4.1
propone convertir el régimen en un campo explícito que el usuario confirme.

## 3. Las cuatro cosas que se pueden hacer con una multa

El motor de plazos calcula exactamente cuatro fechas límite, porque son las
cuatro decisiones posibles ante un expediente:

| Acción | Qué significa | Plazo que aplica hoy el sistema |
|---|---|---|
| **Pago con reducción** | Pagar pronto a cambio de un descuento, renunciando a recurrir. | Tráfico: 20 días naturales desde la notificación. Transporte: 15 días hábiles, marcado como *no fiable* |
| **Alegaciones** | Responder a la denuncia con argumentos y pruebas, antes de que haya resolución. | Tráfico: 20 días naturales. Transporte y genérico: 15 días hábiles |
| **Identificación del conductor** | Decir a la Administración quién conducía. Obligación del titular. | 15 días naturales, marcado como *no fiable* — el documento manda |
| **Recurso** | Impugnar una resolución ya dictada. | 1 mes desde la notificación de la resolución |

**Reducción del 50 %** — El descuento por pago voluntario en plazo del régimen de
tráfico (art. 94 RDL 6/2015). Tiene un coste: **pagar implica renunciar a alegar
y a recurrir**, y la sanción queda firme. Por eso la recomendación "Pagar con
reducción" nunca es inocua, y el sistema la presenta como una decisión, no como
un atajo.

**Identificación del conductor** — Si el titular es una empresa, alguien concreto
conducía. El art. 11 RDL 6/2015 obliga al titular a identificarlo cuando se le
requiere. **No hacerlo es una infracción autónoma, y normalmente mucho más cara
que la multa original.** De ahí que el sistema tenga un estado propio para esto
y genere un aviso de severidad alta.

**Alegaciones vs. recurso** — No son lo mismo y el orden importa: las alegaciones
van *antes* de que haya resolución; el recurso va *después*, contra la resolución
dictada. Presentar lo que no toca en el momento que no toca puede dejar pasar el
plazo bueno.

## 4. Cómo se cuentan los días

| Término | Significado |
|---|---|
| **Días naturales** | Todos, incluidos sábados, domingos y festivos. |
| **Días hábiles** | Excluyen sábados, domingos y festivos (Ley 39/2015, art. 30). |
| **Plazo por meses** | No se cuenta en días: vence el mismo día del mes siguiente. Si ese día no existe, el último del mes. |

⚠️ **Limitación conocida del sistema:** solo conoce **9 festivos nacionales de
fecha fija**. No contempla festivos autonómicos, locales ni móviles (Semana
Santa). Un plazo en días hábiles calculado en abril puede salir mal.
Es `RF-PLAZO-5`, marcado como bloqueante para v1.

**Caducidad y prescripción** — Dos formas de que un expediente decaiga por el
paso del tiempo: la *prescripción* afecta a la infracción o a la sanción; la
*caducidad* afecta al procedimiento, que la Administración debe resolver en
plazo. El sistema tiene cargado el art. 112 RDL 6/2015 como fuente, pero **no
calcula ni vigila estos plazos hoy**. Es una capacidad ausente, no un olvido de
la documentación.

## 5. Tipos de infracción que maneja el sistema

| Término | Qué es |
|---|---|
| **Tacógrafo** | Aparato que registra conducción, pausas y descansos. Regulado por el Reglamento (UE) 165/2014. Manipularlo es de las infracciones más graves. |
| **Tiempos de conducción y descanso** | Límites diarios, semanales y bisemanales del Reglamento (CE) 561/2006. Distinto del tacógrafo: uno regula el aparato, el otro la conducta. |
| **MMA** | Masa máxima autorizada. Superarla es "exceso de peso". |
| **ADR** | Acuerdo europeo de transporte de mercancías peligrosas. Etiquetado y documentación. |
| **ZBE** | Zona de bajas emisiones. Acceso restringido por distintivo ambiental. |
| **CAP** | Certificado de Aptitud Profesional. Obligatorio para conductores profesionales. |
| **ITV** | Inspección técnica de vehículos. |
| **Carta de porte** | Documento que acompaña la mercancía y acredita el contrato de transporte. |
| **Puntos** | Solo en régimen de tráfico, y se detraen al *conductor*, no a la empresa. |

## 6. Vocabulario del producto

| Término | Qué es |
|---|---|
| **Organización** | El *tenant*: una empresa de transporte. Aísla los datos de un cliente de los de otro. Toda tabla de negocio lleva `organization_id`. |
| **Extracción** | Lo que devuelve la IA al leer el documento: campos estructurados, cada uno con **nivel de confianza** (Alto/Medio/Bajo) y el **fragmento literal** de origen. |
| **Campo crítico** | Uno de los 7 cuyo error tiene consecuencia directa (matrícula, nº de expediente, importe, fecha de notificación, fecha límite de pago, artículo, conductor). Si su confianza es Baja, la UI lo marca para verificar. |
| **Análisis** | Evaluación preliminar de la IA: semáforo, recomendación, factores, revisión de procedimiento y de prueba, incoherencias. **Nunca decide**. |
| **Semáforo** | Verde (aparentemente correcto), Naranja (revisión recomendada), Rojo (actuación urgente), **Gris (información insuficiente)**. Gris es el valor por defecto y el de respaldo: ante la duda, el sistema no se moja. |
| **Fuentes verificadas** | El catálogo cerrado de normas (`legal_sources`) que la IA tiene permitido citar. Fuera de esa lista no puede citar nada: es la salvaguarda contra normas y jurisprudencia inventadas. |
| **Borrador** | Escrito de alegaciones o recurso generado por IA, versionado e inmutable por versión. |
| **Validado** | Estado que **solo un revisor jurídico** puede poner a un borrador. Es la barrera humana antes de que un escrito salga hacia la Administración. |
| **Estados del plazo** | `Confirmado` (documento y cálculo coinciden), `Calculado` (solo cálculo, regla fiable), `Pendiente de verificación` (discrepan, o regla poco fiable), `Vencido`, `Plazo pendiente de determinar` (falta la fecha de notificación), `Sin datos`. |
| **Actuación** | Entrada del historial del expediente. Tabla **append-only**: no se edita ni se borra. |

## 7. Vocabulario técnico

| Término | Qué es |
|---|---|
| **RLS** (Row Level Security) | Filtrado por filas en PostgreSQL. Es **el** mecanismo de aislamiento entre empresas: la base de datos impide ver filas de otra organización aunque la consulta no filtre. |
| **`SECURITY DEFINER`** | Función que se ejecuta con los permisos de quien la creó. Aquí resuelven "¿pertenece este usuario a esta organización?" sin exponer las tablas. |
| **Append-only** | Tabla que solo admite inserciones: `sanction_actions`, `sanction_draft_versions`, `document_access_logs`. Políticas `UPDATE/DELETE USING (false)`. |
| **Service binding** | Llamada directa entre Workers de Cloudflare, sin salir a la red pública. Es como el `bff-web` hablará con cada servicio. |
| **Strangler fig** | Estrategia de migración: se extrae un servicio cada vez del monolito, que sigue funcionando, hasta que no queda nada dentro. |

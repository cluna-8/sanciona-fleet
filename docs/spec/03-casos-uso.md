# Casos de uso y criterios de aceptación

Cada caso desarrolla uno o varios requisitos de `SPEC.md` en criterios
**verificables**: se pueden convertir en test o comprobar a mano sin discutir si
están o no cumplidos.

Formato Gherkin (`Dado / Cuando / Entonces`). Estado de cada criterio:

- ✅ **cubierto por test automático** — hay un test que lo demuestra
- 🔶 **implementado, sin test** — el código lo hace, nadie lo verifica
- ❌ **no implementado** — pendiente
- ⚠️ **roto** — el código actual lo contradice

---

## CU-01 · Dar de alta un expediente desde el documento

**Requisitos:** RF-ALTA-1, RF-ALTA-3, RF-ALTA-4, RF-ALTA-5
**Actor:** gestor de sanciones o administrador de empresa

```gherkin
Escenario: El documento se lee y el gestor lo confirma
  Dado que soy gestor de una empresa con el vehiculo "1234 KLM" dado de alta
  Y tengo la notificacion de una multa en PDF
  Cuando la subo al sistema
  Entonces se extraen los campos del documento
  Y cada campo muestra su nivel de confianza
  Y cada campo muestra el fragmento literal del que procede
  Y el vehiculo "1234 KLM" queda asociado automaticamente al expediente
```
🔶 Implementado. Sin test de integración.

```gherkin
Escenario: Un campo critico dudoso se marca para verificar
  Dado que el modelo devuelve la matricula con confianza "Bajo"
  Cuando reviso la extraccion
  Entonces la matricula aparece marcada como "Verificar dato"
  Y no puedo crear el expediente sin haberla mirado
```
✅ La marca de campos críticos dudosos está cubierta por
`packages/ai-provider/test/normalizar.test.ts`.
❌ El bloqueo de creación hasta revisarlos **no existe**: hoy solo se muestra un aviso.

```gherkin
Escenario: El CIF del documento no es el de la empresa
  Dado que la multa va dirigida a un CIF distinto al de mi empresa activa
  Cuando intento crear el expediente
  Entonces el sistema me lo impide
  Y solo puedo continuar pulsando "Continuar de todos modos"
  Y si continuo, queda registrada una actuacion de tipo "Discrepancias detectadas"
  Y otra de "Confirmacion del usuario"
```
🔶 Implementado. Sin test.

```gherkin
Escenario: El vehiculo no esta en la flota
  Dado que la matricula del documento no corresponde a ningun vehiculo mio
  Cuando se procesa el documento
  Entonces aparece el aviso "Vehiculo no localizado en la flota registrada"
  Y el expediente se puede crear igualmente, sin vehiculo asociado
```
🔶 Implementado. Sin test.

---

## CU-02 · Dar de alta un expediente a mano

**Requisito:** RF-ALTA-2 ⚠️ **crítico**
**Actor:** gestor de sanciones

```gherkin
Escenario: Alta manual sin documento
  Dado que tengo los datos de una multa pero no su PDF
  Cuando relleno el formulario manual con los campos obligatorios
  Y pulso el boton de guardar
  Entonces se crea el expediente
  Y queda registrada la actuacion "Registro del expediente"
```
⚠️ **Roto.** El formulario existe y la mutación también, pero **no hay botón de
envío** en `sanciones.nueva.tsx`. Hoy la única vía real de alta es subir un
documento. Si el proveedor de IA cae, no se puede registrar ninguna multa.

```gherkin
Escenario: El alta manual rellena los mismos campos que el alta por IA
  Dado que doy de alta un expediente a mano
  Cuando indico el municipio de la infraccion
  Entonces se guarda en el campo "municipality"
  Y el expediente aparece en el agrupado por zonas de /prevencion
```
❌ No implementado. Hoy `municipality` solo lo rellena el alta por IA, así que
los expedientes manuales nunca aparecen en ese informe (RF-PREV-2).

---

## CU-03 · Calcular los plazos de un expediente

**Requisitos:** RF-PLAZO-1, RF-PLAZO-2, RF-PLAZO-5
**Actor:** el sistema, automáticamente

```gherkin
Escenario: Multa de trafico con fecha de notificacion
  Dado un expediente de la DGT notificado el 1 de marzo
  Cuando se calculan los plazos
  Entonces el pago con reduccion vence a los 20 dias naturales
  Y las alegaciones vencen a los 20 dias naturales
  Y ambos se marcan como regla fiable
```
✅ `services/deadlines-service/test/plazos.test.ts`

```gherkin
Escenario: Multa de transporte
  Dado un expediente del Ministerio de Transportes
  Cuando se calculan los plazos
  Entonces las alegaciones se cuentan en dias habiles
  Y el plazo se marca "Pendiente de verificacion" por ser regla poco fiable
```
✅ Cubierto.

```gherkin
Escenario: No consta la fecha de notificacion
  Dado un expediente del que solo conozco la fecha de emision
  Cuando se calculan los plazos
  Entonces ningun plazo se calcula desde la fecha de emision
  Y el estado es "Plazo pendiente de determinar"
  Y se explica que debe acreditarse la notificacion
```
✅ Cubierto. **Es la regla más importante del motor.**

```gherkin
Escenario: El documento trae una fecha limite distinta a la calculada
  Dado un documento que indica el 25 de marzo como fecha limite
  Y un calculo interno que da el 21 de marzo
  Cuando se contrastan
  Entonces prevalece la fecha del documento
  Y el estado es "Pendiente de verificacion"
  Y se indica que hay 4 dias de discrepancia
```
✅ Cubierto.

```gherkin
Escenario: Plazo en dias habiles que cruza Semana Santa
  Dado un expediente de transporte notificado el Lunes Santo
  Cuando se calculan 15 dias habiles
  Entonces el Jueves y Viernes Santo no cuentan como habiles
```
❌ **No implementado (RF-PLAZO-5).** El motor solo conoce 9 festivos nacionales
de fecha fija. Un plazo calculado en Semana Santa, o en una fiesta autonómica o
local, **sale mal**. Bloqueante para v1.

---

## CU-04 · Analizar un expediente con IA

**Requisitos:** RF-ANALISIS-1, RF-ANALISIS-2
**Actor:** gestor de sanciones

```gherkin
Escenario: El analisis no puede citar normas fuera del catalogo
  Dado que el catalogo de fuentes verificadas tiene 10 normas
  Cuando se genera un analisis
  Entonces solo se citan normas de ese catalogo
  Y si hace falta otro fundamento, se anade el factor "Requiere comprobacion juridica"
```
✅ Las fuentes se inyectan en el prompt y hay test que lo verifica
(`proveedor.test.ts`). La obediencia del modelo a la restricción no es
verificable por test unitario: depende del prompt.

```gherkin
Escenario: El modelo devuelve una respuesta incompleta o invalida
  Dado que el modelo devuelve un semaforo que no existe
  Cuando se normaliza el analisis
  Entonces el semaforo pasa a "Gris"
  Y el nivel de confianza pasa a "Bajo"
  Y la recomendacion pasa a "Revisar"
```
✅ Cubierto. **Ante la duda, el sistema nunca da un falso verde.**

```gherkin
Escenario: El proveedor de IA se queda sin saldo
  Dado que el proveedor devuelve un error 402
  Cuando intento analizar un expediente
  Entonces veo un mensaje claro de que no hay saldo
  Y el mensaje no contiene la clave de API
  Y puedo seguir trabajando con el expediente a mano
```
✅ La traducción del error y la no filtración de la clave están cubiertas.
❌ La continuidad del trabajo a mano depende de CU-02, que está roto.

```gherkin
Escenario: No se mezclan regimenes sancionadores
  Dado un expediente de tacografo del Ministerio de Transportes
  Cuando se genera el analisis
  Entonces no se aplica la reduccion del 50% del articulo 94 de Trafico
  Y se citan los Reglamentos 561/2006 o 165/2014 segun la conducta
```
🔶 Está en el prompt como regla innegociable. **No verificable por test
unitario** — requiere evaluación con expedientes reales y revisión jurídica.

---

## CU-05 · Redactar y validar un escrito

**Requisitos:** RF-BORRADOR-1, RF-BORRADOR-2, RF-BORRADOR-3, RF-BORRADOR-4, RF-BORRADOR-5, RF-BORRADOR-6
**Actores:** gestor de sanciones y revisor jurídico

```gherkin
Escenario: Un gestor no puede validar su propio escrito
  Dado que soy gestor de sanciones
  Cuando abro un borrador
  Entonces puedo editarlo y guardar versiones
  Pero la opcion "Validado" esta deshabilitada
  Y si la fuerzo, la operacion se rechaza en servidor
```
🔶 Implementado en UI **y** en la mutación. Sin test.

```gherkin
Escenario: Faltan datos esenciales en el expediente
  Dado un expediente sin el DNI del conductor
  Cuando se genera el borrador de alegaciones
  Entonces el escrito no afirma que el conductor este identificado
  Y los datos que faltan aparecen como "[PENDIENTE DE COMPLETAR]"
  Y el SUPLICO no pide tener por cumplida la identificacion
```
🔶 Regla explícita del prompt. Requiere validación jurídica.

```gherkin
Escenario: Exportar el escrito
  Cuando pulso "Exportar a PDF"
  Entonces se descarga un archivo PDF valido
  Y con cabecera de empresa (razon social, CIF, direccion)
  Y pie de pagina "Pagina X de N"
  Y queda archivado en Storage con trazabilidad en el historial
```
✅ **Implementado (v0.5).** Server fn `exportarBorrador`: PDF real con pdf-lib,
archivado en Storage y descargado por signedUrl de 60 s; siempre exporta la
última versión guardada (si el editor está sucio, avisa). Insert en
`sanction_actions` ("Exportación de escrito") con `if (error) throw` (A-4).
Test unitario del generador + assert de descarga en el E2E de CU-05.

```gherkin
Escenario: Descargar el escrito editable
  Cuando pulso "Descargar .docx"
  Entonces se descarga un archivo .docx real (OOXML)
  Y se abre en Word sin avisos de formato
```
✅ **Implementado (v0.5).** Lib `docx` server-side, mismo circuito de Storage.
Antes era HTML con extensión `.doc` y MIME falso de Word.

```gherkin
Escenario: Comparar dos versiones
  Dado que un borrador tiene la version 1 y la 2 guardadas
  Cuando pulso "Comparar" en la version 1
  Entonces veo un diff linea a linea entre la version 1 y la ultima guardada
  Y las lineas anadidas y eliminadas se distinguen por prefijo y color
```
✅ **Implementado (v0.5).** `diffLines` (lib diff) entre la versión elegida y
la última guardada; el panel muestra prefijo `+ `/`− ` además de color
(accesible sin distinguir colores) y gancho E2E `data-tipo`. Antes mostraba el
texto completo en un `<pre>` sin diff.

```gherkin
Escenario: Restaurar una version anterior
  Dado que comparo la version 1 con la ultima
  Cuando pulso "Restaurar y guardar version"
  Y confirmo el dialogo si tengo cambios sin guardar
  Entonces se crea una version nueva con el texto de la version 1
  Y nada se destruye: sanction_draft_versions es append-only
```
✅ **Implementado (v0.5).** Antes "Restaurar" solo cargaba el texto en el
editor: si el usuario navegaba fuera, la restauración se perdía (hallazgo
B-7). Ahora restaura guardando, como pedía RF-BORRADOR-6.

---

## CU-06 · Aislamiento entre empresas

**Requisitos:** RS-1, RS-2 ⚠️ **seguridad**

```gherkin
Escenario: No puedo ver expedientes de otra empresa
  Dado que pertenezco a la empresa A
  Cuando pido por su identificador un expediente de la empresa B
  Entonces no obtengo ningun dato
```
🔶 Lo garantiza **solo** RLS. Las cuatro consultas de `/sanciones/$id` no
filtran por `organization_id` (RS-2). Funciona, pero sin defensa en profundidad:
un fallo en una política RLS no tiene segunda barrera.

```gherkin
Escenario: El historial no se puede alterar
  Dado un expediente con actuaciones registradas
  Cuando alguien intenta modificar o borrar una actuacion
  Entonces la base de datos lo rechaza
```
🔶 Políticas `UPDATE/DELETE USING (false)` activas. Sin test.

---

## CU-07 · Alta de empresa en autoservicio

**Requisito:** ⚠️ **sin RF asignado** — capacidad añadida en Lovable el 9 de
septiembre. Ver `docs/legacy/CAMBIOS-LOVABLE.md`.

```gherkin
Escenario: Una empresa se da de alta sola
  Dado que soy una empresa de transporte sin cuenta
  Cuando relleno mis datos, elijo un plan y confirmo
  Entonces se crea mi cuenta y mi empresa
  Y recibo mis credenciales por correo
```
⚠️ **Implementado con problemas graves.** Tal como está hoy:

- el endpoint es **público y crea usuarios con la clave `service_role`**, sin
  captcha ni límite de peticiones;
- la cuenta se marca como verificada (`email_confirm: true`) **sin comprobar que
  el correo sea de quien se da de alta**;
- la contraseña **se devuelve al navegador y se muestra en pantalla**;
- **no hay cobro**: se elige plan y se guarda, pero cualquiera puede darse de
  alta con el plan más caro gratis.

Criterios que **deberían** cumplirse antes de considerar esto terminado:

```gherkin
Escenario: El alta esta protegida contra abuso
  Cuando se reciben muchas altas seguidas desde el mismo origen
  Entonces el sistema las limita

Escenario: La cuenta no se confirma sin probar el correo
  Cuando alguien se da de alta
  Entonces la cuenta queda pendiente hasta que se abre el enlace del correo

Escenario: La contrasena nunca viaja al navegador
  Cuando termina el alta
  Entonces la respuesta no contiene la contrasena
  Y el correo lleva un enlace de un solo uso para establecerla

Escenario: No hay plan sin pago
  Cuando elijo un plan de pago
  Entonces la empresa no queda activa hasta que el cobro se confirma
```
❌ Ninguno implementado.

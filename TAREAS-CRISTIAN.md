# SANCIONA FLEET — Tus tareas

Lista de lo que depende de ti (no de mí) para llevar el proyecto a producción.
Marcado por bloques de prioridad. Actualizado: 7 sep 2026.

---

## 🔴 BLOQUE 0 — Ahora mismo (seguridad y permiso)

- [ ] **Cambiar la contraseña de la cuenta admin fijada por la migración
      `20260903190210`** (email concreto en Supabase Auth / gestor de
      contraseñas; se quitó del repo por RS-3). Esa contraseña en claro quedó
      obsoleta en el esquema propio y además era débil; rotarla desde la app o
      desde Supabase Auth antes de cualquier despliegue real.
- [ ] **Revisar la otra cuenta admin** que quedó como administradora por email
      literal en `20260826144708` (mismo email en Supabase Auth; quitado del
      repo por RS-3).
- [x] **Propiedad resuelta: Cristian y Jorge son socios.** No se reconstruye bajo
      la cuenta personal de ninguno de los dos — todo se crea en cuentas de
      **organización compartida** (GitHub Org, Supabase Org, Cloudflare, dominio),
      con ambos como admin/owner desde el primer día. Ver Bloque 1 y 2 actualizados.

## 🟠 BLOQUE 1 — Me desbloquean a mí (esta semana)

- [ ] Crear una **GitHub Organization** (no repo personal) con Cristian y Jorge
      como *Owners*. Confirmar nombre (`sanciona-fleet` o el de la empresa) y
      que el repo dentro de la org sea **privado**.
- [ ] **Congelar el proyecto en Lovable** — avisar a Jorge (aunque sean socios,
      si se sigue editando ahí mientras yo trabajo en el repo, diverge y el
      merge pasa a ser manual).
- [ ] Ejecutar **`export-datos.sql`** en Lovable → Cloud → SQL editor y pasarme el
      JSON, si quieres conservar los datos.
- [ ] Decidir: **¿migramos las 6 cuentas reales o arrancamos limpio?**
      (las 21 sanciones, 8 vehículos y 10 conductores son demo sembrada).
- [ ] **Descargar los 4 documentos** del bucket `sanction-documents` si tienen valor.
- [ ] **Descargar las 2 imágenes** de la landing desde `sanciona.lovable.app`
      (hero y portada), o decidir sustituirlas por otras.

## 🟡 BLOQUE 2 — Infraestructura (crearla como socios, no como individuo)

> Arquitectura confirmada: **microservicios** (ver `SPEC.md` §7), no un único
> monolito. Eso no cambia lo que necesitas crear en este bloque (sigue siendo
> una sola cuenta Supabase/Cloudflare compartida), solo cómo se organiza el
> código dentro (monorepo, un Worker de Cloudflare por servicio).

- [ ] **Supabase Organization** compartida (Settings → Organizations), con
      Cristian y Jorge como miembros Admin/Owner. Dentro, el proyecto en
      región EU (Frankfurt o Irlanda, por RGPD). Necesitaré: `SUPABASE_URL`,
      la clave publicable y la `service_role`.
- [ ] **Proveedor de IA + API key**, con cuenta/facturación de empresa (no
      personal). El código usa hoy `google/gemini-3.7-flash`, así que Google AI
      Studio es el camino de menos fricción. Alternativas: OpenAI, Anthropic,
      OpenRouter. Mira precio por documento procesado.
- [ ] **Cuenta de hosting** a nombre del negocio, con ambos como miembros admin.
      Cloudflare Workers es la de menos fricción (Nitro ya compila a ese
      target). Vercel también vale.
- [ ] **Dominio propio** registrado a nombre de la empresa (o con ambos como
      admins en el registrar) + DNS. Ojo: `sancionafleet.com`, `sanciona.com`,
      `multascontrol.com` y `flotasancion.com` aparecían libres en Lovable.
- [ ] Definir **entornos**: dev / staging / producción (3 proyectos Supabase o
      3 esquemas). Recomiendo 3 proyectos separados, todos bajo la misma org.
- [ ] Acordar **gestor de contraseñas compartido** (1Password/Bitwarden con
      "vault" de equipo) para las API keys y secretos — nada debe vivir solo
      en el correo o el portátil de una persona.

## 🟢 BLOQUE 3 — Decisiones de producto (para la especificación)

Ninguna la puedo tomar yo. Cada una cambia la spec.

- [ ] **Organismos sancionadores.** Hoy es lista cerrada con solo Valencia,
      Alicante y Castellón. ¿Se abre a campo libre? Cuidado: el motor de plazos
      deduce el régimen (tráfico vs transporte) del texto del organismo, así que
      abrirlo exige rediseñar esa detección.
- [ ] **Categorías de infracción.** Hay dos catálogos incompatibles conviviendo
      (14 valores en el alta manual, 10 en el alta por IA) escribiendo en el mismo
      campo. Hay que elegir uno.
- [ ] **Máquina de estados.** Hoy se puede saltar de cualquier estado a cualquiera.
      ¿Qué transiciones son válidas? ¿Quién puede hacer cada una?
- [ ] **Roles.** ¿Se quedan los tres? ¿`revisor_juridico` se llama "Gestor legal"
      o "Revisor jurídico"? Hoy conviven ambos nombres.
- [ ] **Multiempresa.** ¿Una gestoría gestionando varias flotas, o una cuenta por
      empresa? Hoy el código crea una empresa automáticamente por usuario.
- [ ] **Modelo de negocio.** ¿Suscripción? ¿Por vehículo, por expediente, por
      usuario? Define si hace falta Stripe y facturación.
- [ ] **Prioridad "Media"**: existe en el enum y en la UI pero no en la lista de
      prioridades. ¿Se elimina o se recupera?
- [ ] **Alcance del MVP.** De los 34 hallazgos, ¿cuáles entran en la v1?
      Mi propuesta mínima: alta manual arreglada, borrado, paginación,
      plazos unificados y PDF real.

## 🔵 BLOQUE 4 — Legal y cumplimiento (crítico, no lo dejes para el final)

- [ ] **Validación jurídica del motor de plazos por un abogado administrativista.**
      Los plazos (20 días naturales tráfico / 15 hábiles transporte, 1 mes recurso)
      están razonados en el código, pero un error aquí hace perder plazos a un
      cliente. No soy abogado y esto no es asesoramiento legal: necesita revisión
      profesional.
- [ ] **Festivos.** El motor solo conoce 9 festivos nacionales fijos. Faltan los
      autonómicos, los locales y los móviles (Semana Santa). Decide si se integra
      un calendario oficial o una fuente de datos.
- [ ] **Revisión jurídica de los prompts de IA** (extracción, análisis, borradores)
      y del descargo de responsabilidad que ve el usuario.
- [ ] **RGPD.** Tratas nombre, DNI, email y teléfono de conductores, más documentos
      sancionadores. Necesitas: registro de actividades de tratamiento, política de
      privacidad, base legal, plazos de conservación y **contrato de encargado de
      tratamiento con el proveedor de IA** (los documentos con datos personales se
      le envían). Verifica que el proveedor no entrene con tus datos.
- [ ] **Condiciones de uso** dejando claro que el análisis es preliminar y no
      constituye asesoramiento jurídico (la landing ya lo dice; hay que formalizarlo).
- [ ] **Política de retención** de documentos en Storage y derecho de supresión.

## ⚪ BLOQUE 5 — Cuando ya haya código

- [ ] Revisar la especificación que te entregue y corregir lo que no encaje con tu
      visión de producto.
- [ ] Probar el flujo completo con **un expediente sancionador real** (anonimizado)
      y validar que la extracción y el análisis son correctos.
- [ ] Decidir si el proyecto Lovable se archiva o se mantiene como entorno de
      prototipado.

---

## Orden sugerido

1. Bloque 0 entero (hoy).
2. Confirmarme repo + congelar Lovable → yo arranco.
3. Bloque 3 en paralelo mientras escribo la spec: tus respuestas entran en ella.
4. Bloque 2 antes del primer despliegue.
5. Bloque 4 antes de tener un solo cliente real.

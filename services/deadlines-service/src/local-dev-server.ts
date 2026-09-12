/**
 * Servidor de desarrollo local para docker-compose (Etapa 4 del plan de
 * refactor). NO es lo que se despliega a producción — producción sigue
 * siendo `wrangler deploy` (Worker real, con workerd). Este shim existe
 * porque `wrangler dev` (workerd) no completa el handshake HTTP dentro del
 * contenedor Docker anidado de este entorno de sandbox (el puerto acepta la
 * conexión TCP pero nunca responde; verificado con una petición HTTP cruda
 * por socket). Reutiliza exactamente la misma lógica de negocio
 * (`manejarFetch` / `calcularPlazos`), así que lo que se prueba en local es
 * el mismo comportamiento — solo cambia el runtime que sirve HTTP.
 */
import { manejarFetch } from "./http";

const port = Number(process.env["PORT"] ?? 8787);

Bun.serve({
  hostname: "0.0.0.0",
  port,
  fetch: manejarFetch,
});

console.log(`[deadlines-service:local] escuchando en http://0.0.0.0:${port}`);

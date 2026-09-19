/**
 * Ruta de salud pública para healthchecks (Docker, AWS target group, Cloudflare).
 * No requiere auth. Responde 200 sin montar lógica de negocio: solo confirma que
 * el proceso SSR de bff-web atiende peticiones. Ver ADR 0003.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "health" }] }),
  component: () => <div data-testid="health">ok</div>,
});

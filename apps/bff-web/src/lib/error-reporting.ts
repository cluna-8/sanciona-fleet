// Sustituye a lib/lovable-error-reporting.ts (que reportaba al editor de
// Lovable vía window.__lovableEvents, inexistente fuera de él). Ver plan de
// refactor §1.3/§4.5: aquí es donde engancha el proveedor de observabilidad
// definitivo (Sentry, Workers Logs…) cuando se elija.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("[error-boundary]", message, { context, stack });
}

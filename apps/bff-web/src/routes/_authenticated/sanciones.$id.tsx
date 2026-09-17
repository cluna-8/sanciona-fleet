import { createFileRoute } from "@tanstack/react-router";
import { PaginaFichaExpediente } from "@/features/expedientes/pages/PaginaFichaExpediente";

export const Route = createFileRoute("/_authenticated/sanciones/$id")({
  component: PaginaFichaExpediente,
});

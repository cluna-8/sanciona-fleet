import { createFileRoute } from "@tanstack/react-router";
import { PaginaNuevaSancion } from "@/features/expedientes/pages/PaginaNuevaSancion";

export const Route = createFileRoute("/_authenticated/sanciones/nueva")({
  component: PaginaNuevaSancion,
});

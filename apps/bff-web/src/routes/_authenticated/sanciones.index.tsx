import { createFileRoute } from "@tanstack/react-router";
import { PaginaListadoSanciones } from "@/features/expedientes/pages/PaginaListadoSanciones";

export const Route = createFileRoute("/_authenticated/sanciones/")({
  component: PaginaListadoSanciones,
});

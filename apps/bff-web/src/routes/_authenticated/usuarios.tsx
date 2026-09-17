import { createFileRoute } from "@tanstack/react-router";
import { PaginaUsuarios } from "@/features/organizacion/pages/PaginaUsuarios";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: PaginaUsuarios,
});

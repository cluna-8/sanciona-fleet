import { createFileRoute } from "@tanstack/react-router";
import { PaginaConductores } from "@/features/flota/pages/PaginaConductores";

export const Route = createFileRoute("/_authenticated/conductores/")({
  component: PaginaConductores,
});

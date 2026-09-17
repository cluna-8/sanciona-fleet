import { createFileRoute } from "@tanstack/react-router";
import { PaginaVehiculos } from "@/features/flota/pages/PaginaVehiculos";

export const Route = createFileRoute("/_authenticated/vehiculos/")({
  component: PaginaVehiculos,
});

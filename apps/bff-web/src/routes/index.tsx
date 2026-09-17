import { createFileRoute } from "@tanstack/react-router";
import { PaginaAcceso } from "@/features/alta/pages/PaginaAcceso";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acceder · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Accede o date de alta en Sanciona Fleet para gestionar las sanciones de tu flota de transporte.",
      },
      { property: "og:title", content: "Acceder · Sanciona Fleet" },
      {
        property: "og:description",
        content:
          "Inicia sesión o date de alta en el gestor de sanciones para empresas de transporte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaAcceso,
});

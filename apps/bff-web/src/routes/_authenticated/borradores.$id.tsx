import { createFileRoute, useParams } from "@tanstack/react-router";
import { PaginaEditorBorrador } from "@/features/borradores/pages/PaginaEditorBorrador";

export const Route = createFileRoute("/_authenticated/borradores/$id")({
  component: RutaEditorBorrador,
  head: () => ({
    meta: [
      { title: "Editor de escritos · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Edita, versiona y valida los borradores de alegaciones y recursos de cada expediente sancionador.",
      },
    ],
  }),
});

function RutaEditorBorrador() {
  const { id } = useParams({ from: "/_authenticated/borradores/$id" });
  // key={id} fuerza el remount al cambiar de escrito — fix del bug de pérdida
  // de edición (PLAN-REFACTOR-FRONTEND.md §3.6).
  return <PaginaEditorBorrador key={id} id={id} />;
}

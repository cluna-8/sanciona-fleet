import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useSesion } from "@/hooks/use-org";
import { useAvisos, useMarcarAvisosLeidos } from "@/features/avisos";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/avisos")({
  component: Avisos,
  head: () => ({
    meta: [
      { title: "Avisos del expediente · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Avisos internos de plazos próximos, documentación pendiente, análisis completados y borradores por revisar.",
      },
    ],
  }),
});

const CLASES_SEVERIDAD: Record<string, string> = {
  alta: "border-destructive/30 bg-destructive/5",
  info: "border-border bg-card",
  media: "border-accent/40 bg-accent/5",
};

function Avisos() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: avisos } = useAvisos(orgId);

  const marcarMut = useMarcarAvisosLeidos(orgId);
  const marcar = {
    mutate: (id: string | null) =>
      marcarMut.mutate(id, {
        onSuccess: () => toast.success("Avisos actualizados"),
        onError: (e: Error) => toast.error(e.message),
      }),
  };

  const pendientes = (avisos ?? []).filter((a) => !a.read_at);

  return (
    <AppShell
      titulo="Avisos"
      descripcion="Seguimiento interno de plazos, documentación y expedientes"
      acciones={
        pendientes.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => marcar.mutate(null)}>
            <Check className="mr-1.5 h-3.5 w-3.5" /> Marcar todos como leídos
          </Button>
        ) : null
      }
    >
      {(avisos ?? []).length === 0 ? (
        <p className="card-surface p-8 text-center text-sm text-muted-foreground">
          No hay avisos registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {(avisos ?? []).map((a) => (
            <li
              key={a.id}
              className={`flex items-start justify-between gap-4 rounded-lg border p-4 ${
                CLASES_SEVERIDAD[a.severity] ?? CLASES_SEVERIDAD["info"]
              } ${a.read_at ? "opacity-60" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BellRing className="h-3.5 w-3.5 text-navy" />
                  <p className="text-sm font-medium">{a.title}</p>
                </div>
                {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.notification_type} · {new Date(a.created_at).toLocaleString("es-ES")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {a.sanction_id && (
                  <Link
                    to="/sanciones/$id"
                    params={{ id: a.sanction_id }}
                    className="text-xs text-navy hover:underline"
                  >
                    Ver expediente
                  </Link>
                )}
                {!a.read_at && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => marcar.mutate(a.id)}
                  >
                    Marcar leído
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

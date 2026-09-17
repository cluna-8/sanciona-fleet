import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useInvitaciones, useEliminarInvitacion } from "@/features/organizacion";
import { Button } from "@/components/ui/button";
import { etiquetaRol } from "@/shared/lib/formato";

/**
 * Listado de invitaciones pendientes. Antes era el sub-componente `Invitaciones`
 * inline en usuarios.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.5.
 */
export function ListaInvitaciones({ orgId }: { orgId: string }) {
  const { data: invitaciones } = useInvitaciones(orgId);
  const eliminarMut = useEliminarInvitacion(orgId);
  const eliminar = {
    isPending: eliminarMut.isPending,
    mutate: (id: string) =>
      eliminarMut.mutate(id, {
        onSuccess: () => toast.success("Invitación eliminada"),
        onError: (e: Error) => toast.error(e.message),
      }),
  };

  if (!invitaciones || invitaciones.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold">Invitaciones</h2>
      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Correo</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invitaciones.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-5 py-3 font-medium">{i.full_name ?? "—"}</td>
                <td className="px-5 py-3">{i.email}</td>
                <td className="px-5 py-3">{etiquetaRol(i.role)}</td>
                <td className="px-5 py-3 capitalize">{i.status}</td>
                <td className="px-5 py-3 text-right">
                  {i.status === "pendiente" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminar.mutate(i.id)}
                      disabled={eliminar.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

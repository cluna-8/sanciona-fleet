import { toast } from "sonner";
import { UserCog } from "lucide-react";
import { AppShell } from "@/shared/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSesion,
  esAdministrador,
  useEsSuperadmin,
  useMiembros,
  useCambiarRolMiembro,
} from "@/features/organizacion";
import { InvitarUsuario } from "@/features/organizacion/components/InvitarUsuario";
import { ListaInvitaciones } from "@/features/organizacion/components/ListaInvitaciones";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES } from "@sanciona/contracts";
import { etiquetaRol, formatoFecha } from "@/shared/lib/formato";

/**
 * Listado de miembros de la empresa. Antes era el componente `Usuarios` (271
 * líneas) en usuarios.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.5.
 * Alta (invitación) y listado de invitaciones viven en sus componentes.
 */
export function PaginaUsuarios() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: superadmin } = useEsSuperadmin();
  const admin = esAdministrador(sesion?.role) || Boolean(superadmin);

  const { data: miembros, isLoading } = useMiembros(orgId);

  const cambiarRolMut = useCambiarRolMiembro(orgId);
  const cambiarRol = {
    mutate: ({ id, rol }: { id: string; rol: string }) =>
      cambiarRolMut.mutate(
        { id, rol },
        {
          onSuccess: () => toast.success("Rol actualizado"),
          onError: (e: Error) => toast.error(e.message),
        },
      ),
  };

  return (
    <AppShell
      titulo="Usuarios"
      descripcion="Miembros con acceso a los expedientes de la empresa"
      acciones={admin && orgId ? <InvitarUsuario orgId={orgId} userId={sesion!.userId} /> : null}
    >
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Correo</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {(miembros ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-navy" />
                      {m.profiles?.full_name || "Sin nombre"}
                    </span>
                  </td>
                  <td className="px-5 py-3">{m.profiles?.email ?? "—"}</td>
                  <td className="px-5 py-3">
                    {admin && m.user_id !== sesion?.userId ? (
                      <Select
                        value={m.role}
                        onValueChange={(rol) => cambiarRol.mutate({ id: m.id, rol })}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      etiquetaRol(m.role)
                    )}
                  </td>
                  <td className="px-5 py-3 capitalize">{m.status}</td>
                  <td className="px-5 py-3">{formatoFecha(m.created_at.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {admin && orgId && <ListaInvitaciones orgId={orgId} />}
      {!admin && (
        <p className="mt-4 text-xs text-muted-foreground">
          Solo el administrador de la empresa puede modificar los roles.
        </p>
      )}
    </AppShell>
  );
}

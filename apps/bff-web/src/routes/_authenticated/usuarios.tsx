import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCog, UserPlus, Loader2, Trash2 } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { useSesion, esAdministrador, useEsSuperadmin } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, etiquetaRol, formatoFecha } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: Usuarios,
});

type Miembro = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

function Usuarios() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: superadmin } = useEsSuperadmin();
  const admin = esAdministrador(sesion?.role) || Boolean(superadmin);
  const queryClient = useQueryClient();

  const { data: miembros, isLoading } = useQuery({
    queryKey: ["miembros", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, status, created_at")
        .eq("organization_id", orgId!)
        .order("created_at");
      if (error) throw error;
      const filas = (data ?? []) as Miembro[];
      const ids = filas.map((m) => m.user_id);
      if (ids.length) {
        const { data: perfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const mapa = new Map((perfiles ?? []).map((p) => [p.id, p]));
        for (const m of filas) {
          const p = mapa.get(m.user_id);
          m.profiles = p ? { full_name: p.full_name, email: p.email } : null;
        }
      }
      return filas;
    },
  });

  const cambiarRol = useMutation({
    mutationFn: async ({ id, rol }: { id: string; rol: string }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: rol } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["miembros"] });
      toast.success("Rol actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
      {admin && orgId && <Invitaciones orgId={orgId} />}
      {!admin && (
        <p className="mt-4 text-xs text-muted-foreground">
          Solo el administrador de la empresa puede modificar los roles.
        </p>
      )}
    </AppShell>
  );
}

const esquemaInvitacion = z.object({
  email: z.string().trim().email("Correo no válido").max(255),
  full_name: z.string().trim().min(3, "Indica el nombre completo").max(120),
});

function InvitarUsuario({ orgId, userId }: { orgId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [rol, setRol] = useState<string>("gestor_sanciones");
  const [errores, setErrores] = useState<Record<string, string>>({});

  const invitar = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = esquemaInvitacion.safeParse({
        email: String(form.get("email") ?? ""),
        full_name: String(form.get("full_name") ?? ""),
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
        setErrores(errs);
        throw new Error("Revisa los campos marcados");
      }
      setErrores({});
      const { error } = await supabase.from("organization_invitations").insert({
        organization_id: orgId,
        email: parsed.data.email.toLowerCase(),
        full_name: parsed.data.full_name,
        role: rol,
        invited_by: userId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitaciones"] });
      setAbierto(false);
      toast.success("Usuario invitado. Accederá a la empresa al registrarse con ese correo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Añadir usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir usuario a la empresa</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            invitar.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input name="full_name" maxLength={120} required />
            {errores["full_name"] && (
              <p className="text-xs text-destructive">{errores["full_name"]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input name="email" type="email" maxLength={255} required />
            {errores["email"] && <p className="text-xs text-destructive">{errores["email"]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={setRol}>
              <SelectTrigger>
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
          </div>
          <p className="text-xs text-muted-foreground">
            Cuando esta persona cree su cuenta con ese correo, entrará directamente en la empresa
            con el rol asignado.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={invitar.isPending}>
              {invitar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Invitaciones({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const { data: invitaciones } = useQuery({
    queryKey: ["invitaciones", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invitations")
        .select("id, email, full_name, role, status, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitaciones"] });
      toast.success("Invitación eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

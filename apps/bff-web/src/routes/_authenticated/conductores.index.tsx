import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import { useConductores, useSanciones, type Conductor } from "@/hooks/use-datos";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatoImporte } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/conductores/")({
  component: Conductores,
});

const esquema = z.object({
  full_name: z.string().trim().min(3, "Indica el nombre completo").max(120),
  identification_number: z.string().trim().max(20).optional(),
  email: z.union([z.string().trim().email("Correo no válido").max(255), z.literal("")]),
  phone: z.string().trim().max(20).optional(),
});

function Conductores() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: conductores, isLoading } = useConductores(orgId);
  const { data: sanciones } = useSanciones(orgId);
  const queryClient = useQueryClient();
  const gestor = puedeGestionar(sesion?.role);
  const [abierto, setAbierto] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Sesión no válida");
      const parsed = esquema.safeParse({
        full_name: String(form.get("full_name") ?? ""),
        identification_number: String(form.get("identification_number") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
        setErrores(errs);
        throw new Error("Revisa los campos marcados");
      }
      setErrores({});
      const d = parsed.data;
      const { error } = await supabase.from("drivers").insert({
        organization_id: orgId,
        full_name: d.full_name,
        identification_number: d.identification_number || null,
        email: d.email || null,
        phone: d.phone || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      setAbierto(false);
      toast.success("Conductor añadido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo="Conductores"
      descripcion="Personal de conducción asociado a la empresa"
      acciones={
        gestor ? (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nuevo conductor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo conductor</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  crear.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-1.5">
                  <Label>Nombre completo</Label>
                  <Input name="full_name" maxLength={120} required />
                  {errores["full_name"] && (
                    <p className="text-xs text-destructive">{errores["full_name"]}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>DNI / NIE</Label>
                    <Input name="identification_number" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teléfono</Label>
                    <Input name="phone" maxLength={20} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Correo electrónico</Label>
                  <Input name="email" type="email" maxLength={255} />
                  {errores["email"] && (
                    <p className="text-xs text-destructive">{errores["email"]}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={crear.isPending}>
                    {crear.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (conductores ?? []).length === 0 ? (
        <div className="card-surface p-12 text-center text-sm text-muted-foreground">
          Todavía no hay conductores registrados.
        </div>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Conductor</th>
                <th className="px-5 py-3 font-medium">DNI / NIE</th>
                <th className="px-5 py-3 font-medium">Contacto</th>
                <th className="px-5 py-3 font-medium">Sanciones</th>
                <th className="px-5 py-3 font-medium">Importe acumulado</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                {gestor && <th className="px-5 py-3 font-medium text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {(conductores ?? []).map((c) => {
                const propias = (sanciones ?? []).filter((s) => s.driver_id === c.id);
                const importe = propias.reduce((a, s) => a + Number(s.original_amount ?? 0), 0);
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        to="/conductores/$id"
                        params={{ id: c.id }}
                        className="text-navy hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </td>

                    <td className="px-5 py-3">{c.identification_number ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="block">{c.email ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{c.phone ?? ""}</span>
                    </td>
                    <td className="px-5 py-3">{propias.length}</td>
                    <td className="px-5 py-3 tabular-nums">{formatoImporte(importe)}</td>
                    <td className="px-5 py-3">{c.status}</td>
                    {gestor && (
                      <td className="px-5 py-3 text-right">
                        <EditarConductor conductor={c} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

const ESTADOS_CONDUCTOR = ["activo", "inactivo"];

function EditarConductor({ conductor }: { conductor: Conductor }) {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState(conductor.status);

  const guardar = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = esquema.safeParse({
        full_name: String(form.get("full_name") ?? ""),
        identification_number: String(form.get("identification_number") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos no válidos");
      const d = parsed.data;
      const { error } = await supabase
        .from("drivers")
        .update({
          full_name: d.full_name,
          identification_number: d.identification_number || null,
          email: d.email || null,
          phone: d.phone || null,
          status: estado,
        } as never)
        .eq("id", conductor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conductores"] });
      setAbierto(false);
      toast.success("Conductor actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar conductor</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input name="full_name" maxLength={120} required defaultValue={conductor.full_name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>DNI / NIE</Label>
              <Input
                name="identification_number"
                maxLength={20}
                defaultValue={conductor.identification_number ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input name="phone" maxLength={20} defaultValue={conductor.phone ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input name="email" type="email" maxLength={255} defaultValue={conductor.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_CONDUCTOR.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

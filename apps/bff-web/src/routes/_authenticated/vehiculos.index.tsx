import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { useSesion, puedeGestionar } from "@/hooks/use-org";
import { useVehiculos, useSanciones, type Vehiculo } from "@/hooks/use-datos";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_VEHICULO, formatoImporte, formatoFecha } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/vehiculos/")({
  component: Vehiculos,
});

const esquema = z.object({
  registration_number: z.string().trim().min(4, "Matrícula no válida").max(15),
  internal_code: z.string().trim().max(30).optional(),
  brand: z.string().trim().max(50).optional(),
  model: z.string().trim().max(50).optional(),
});

function Vehiculos() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: vehiculos, isLoading } = useVehiculos(orgId);
  const { data: sanciones } = useSanciones(orgId);
  const queryClient = useQueryClient();
  const gestor = puedeGestionar(sesion?.role);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(TIPOS_VEHICULO[0]!);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Sesión no válida");
      const parsed = esquema.safeParse({
        registration_number: String(form.get("registration_number") ?? ""),
        internal_code: String(form.get("internal_code") ?? ""),
        brand: String(form.get("brand") ?? ""),
        model: String(form.get("model") ?? ""),
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
        setErrores(errs);
        throw new Error("Revisa los campos marcados");
      }
      setErrores({});
      const d = parsed.data;
      const { error } = await supabase.from("vehicles").insert({
        organization_id: orgId,
        registration_number: d.registration_number.toUpperCase(),
        internal_code: d.internal_code || null,
        brand: d.brand || null,
        model: d.model || null,
        vehicle_type: tipo,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehiculos"] });
      setAbierto(false);
      toast.success("Vehículo añadido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      titulo="Vehículos"
      descripcion="Flota registrada en la empresa"
      acciones={
        gestor ? (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nuevo vehículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo vehículo</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  crear.mutate(new FormData(e.currentTarget));
                }}
              >
                <div className="space-y-1.5">
                  <Label>Matrícula</Label>
                  <Input
                    name="registration_number"
                    maxLength={15}
                    required
                    placeholder="1234 ABC"
                  />
                  {errores["registration_number"] && (
                    <p className="text-xs text-destructive">{errores["registration_number"]}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Código interno</Label>
                    <Input name="internal_code" maxLength={30} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={tipo} onValueChange={setTipo}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_VEHICULO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marca</Label>
                    <Input name="brand" maxLength={50} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modelo</Label>
                    <Input name="model" maxLength={50} />
                  </div>
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
      ) : (vehiculos ?? []).length === 0 ? (
        <div className="card-surface p-12 text-center text-[13px] text-muted-foreground">
          Todavía no hay vehículos registrados.
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Matrícula</th>
                  <th className="px-4 py-2 font-medium">Código interno</th>
                  <th className="px-4 py-2 font-medium">Marca</th>
                  <th className="px-4 py-2 font-medium">Modelo</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium text-right">Sanciones</th>
                  <th className="px-4 py-2 font-medium text-right">Importe acumulado</th>
                  <th className="px-4 py-2 font-medium">Última sanción</th>
                  {gestor && <th className="px-4 py-2 font-medium text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {(vehiculos ?? []).map((v) => {
                  const propias = (sanciones ?? []).filter((s) => s.vehicle_id === v.id);
                  const importe = propias.reduce((a, s) => a + Number(s.original_amount ?? 0), 0);
                  const ultima = propias
                    .map((s) => s.notification_date ?? s.created_at.slice(0, 10))
                    .sort()
                    .at(-1);
                  return (
                    <tr key={v.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-4 py-2 font-medium">
                        <Link
                          to="/vehiculos/$id"
                          params={{ id: v.id }}
                          className="text-navy hover:underline"
                        >
                          {v.registration_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{v.internal_code ?? "—"}</td>
                      <td className="px-4 py-2">{v.brand ?? "—"}</td>
                      <td className="px-4 py-2">{v.model ?? "—"}</td>
                      <td className="px-4 py-2">{v.vehicle_type ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{v.status}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{propias.length}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatoImporte(importe)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {formatoFecha(ultima)}
                      </td>
                      {gestor && (
                        <td className="px-4 py-2 text-right">
                          <EditarVehiculo vehiculo={v} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const ESTADOS_FLOTA = ["activo", "inactivo"];

function EditarVehiculo({ vehiculo }: { vehiculo: Vehiculo }) {
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(vehiculo.vehicle_type ?? TIPOS_VEHICULO[0]!);
  const [estado, setEstado] = useState(vehiculo.status);

  const guardar = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = esquema.safeParse({
        registration_number: String(form.get("registration_number") ?? ""),
        internal_code: String(form.get("internal_code") ?? ""),
        brand: String(form.get("brand") ?? ""),
        model: String(form.get("model") ?? ""),
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos no válidos");
      const d = parsed.data;
      const { error } = await supabase
        .from("vehicles")
        .update({
          registration_number: d.registration_number.toUpperCase(),
          internal_code: d.internal_code || null,
          brand: d.brand || null,
          model: d.model || null,
          vehicle_type: tipo,
          status: estado,
        } as never)
        .eq("id", vehiculo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehiculos"] });
      setAbierto(false);
      toast.success("Vehículo actualizado");
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
          <DialogTitle>Editar vehículo</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Matrícula</Label>
            <Input
              name="registration_number"
              maxLength={15}
              required
              defaultValue={vehiculo.registration_number}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Código interno</Label>
              <Input
                name="internal_code"
                maxLength={30}
                defaultValue={vehiculo.internal_code ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VEHICULO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input name="brand" maxLength={50} defaultValue={vehiculo.brand ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input name="model" maxLength={50} defaultValue={vehiculo.model ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_FLOTA.map((e) => (
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

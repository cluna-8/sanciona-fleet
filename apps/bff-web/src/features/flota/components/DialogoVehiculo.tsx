import { useState } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSesion } from "@/hooks/use-org";
import {
  useCrearVehiculo,
  useActualizarVehiculo,
  ESTADOS_FLOTA,
  type Vehiculo,
} from "@/features/flota";
import { ValidationError } from "@/shared/lib/errores";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_VEHICULO } from "@sanciona/contracts";

/**
 * Diálogo de alta y edición de vehículo. Antes vivía como dos bloques de form
 * inline (uno en la cabecera, `EditarVehiculo` al pie) en vehiculos.index.tsx
 * — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.5. Mismo form, dos modos.
 */
export function DialogoVehiculo({
  modo,
  vehiculo,
}: {
  modo: "crear" | "editar";
  vehiculo?: Vehiculo;
}) {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(vehiculo?.vehicle_type ?? TIPOS_VEHICULO[0]!);
  const [estado, setEstado] = useState(vehiculo?.status ?? "activo");
  const [errores, setErrores] = useState<Record<string, string>>({});

  const crear = useCrearVehiculo(orgId, tipo);
  const guardar = useActualizarVehiculo(orgId, vehiculo?.id ?? "", tipo, estado);
  const pendiente = modo === "crear" ? crear.isPending : guardar.isPending;

  function enviar(form: FormData) {
    setErrores({});
    const mut = modo === "crear" ? crear : guardar;
    mut.mutate(form, {
      onSuccess: () => {
        setAbierto(false);
        toast.success(modo === "crear" ? "Vehículo añadido" : "Vehículo actualizado");
      },
      onError: (e: Error) => {
        if (e instanceof ValidationError) setErrores(e.fieldErrors);
        toast.error(e.message);
      },
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {modo === "crear" ? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo vehículo
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modo === "crear" ? "Nuevo vehículo" : "Editar vehículo"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Matrícula</Label>
            <Input
              name="registration_number"
              maxLength={15}
              required
              placeholder="1234 ABC"
              defaultValue={vehiculo?.registration_number}
            />
            {errores["registration_number"] && (
              <p className="text-xs text-destructive">{errores["registration_number"]}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Código interno</Label>
              <Input
                name="internal_code"
                maxLength={30}
                defaultValue={vehiculo?.internal_code ?? ""}
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
              <Input name="brand" maxLength={50} defaultValue={vehiculo?.brand ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input name="model" maxLength={50} defaultValue={vehiculo?.model ?? ""} />
            </div>
          </div>
          {modo === "editar" && (
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
          )}
          <DialogFooter>
            <Button type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {modo === "crear" ? "Guardar" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSesion } from "@/hooks/use-org";
import {
  useCrearConductor,
  useActualizarConductor,
  ESTADOS_FLOTA,
  type Conductor,
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

/**
 * Diálogo de alta y edición de conductor. Antes vivía como dos bloques de form
 * inline en conductores.index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md
 * §3.5. Mismo form, dos modos.
 */
export function DialogoConductor({
  modo,
  conductor,
}: {
  modo: "crear" | "editar";
  conductor?: Conductor;
}) {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState(conductor?.status ?? "activo");
  const [errores, setErrores] = useState<Record<string, string>>({});

  const crear = useCrearConductor(orgId);
  const guardar = useActualizarConductor(orgId, conductor?.id ?? "", estado);
  const pendiente = modo === "crear" ? crear.isPending : guardar.isPending;

  function enviar(form: FormData) {
    setErrores({});
    const mut = modo === "crear" ? crear : guardar;
    mut.mutate(form, {
      onSuccess: () => {
        setAbierto(false);
        toast.success(modo === "crear" ? "Conductor añadido" : "Conductor actualizado");
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
            <Plus className="mr-2 h-4 w-4" /> Nuevo conductor
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modo === "crear" ? "Nuevo conductor" : "Editar conductor"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input name="full_name" maxLength={120} required defaultValue={conductor?.full_name} />
            {errores["full_name"] && (
              <p className="text-xs text-destructive">{errores["full_name"]}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>DNI / NIE</Label>
              <Input
                name="identification_number"
                maxLength={20}
                defaultValue={conductor?.identification_number ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input name="phone" maxLength={20} defaultValue={conductor?.phone ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input
              name="email"
              type="email"
              maxLength={255}
              defaultValue={conductor?.email ?? ""}
            />
            {errores["email"] && <p className="text-xs text-destructive">{errores["email"]}</p>}
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

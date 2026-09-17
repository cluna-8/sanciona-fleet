import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/shared/components/AppShell";
import { AltaDesdeDocumento } from "@/components/alta-documento";
import { useSesion } from "@/hooks/use-org";
import { useVehiculos, useConductores } from "@/features/flota";
import { useCrearSancionManual, type DatosSancionManual } from "@/features/expedientes";
import { ValidationError } from "@/shared/lib/errores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTADOS_SANCION,
  PRIORIDADES,
  CATEGORIAS,
  ORGANISMOS,
  TIPOS_DOCUMENTO,
} from "@sanciona/contracts";

export const Route = createFileRoute("/_authenticated/sanciones/nueva")({
  component: NuevaSancion,
});

const SIN_ASIGNAR = "__ninguno__";

function NuevaSancion() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: vehiculos } = useVehiculos(orgId);
  const { data: conductores } = useConductores(orgId);
  const navigate = useNavigate();

  const [vehiculo, setVehiculo] = useState(SIN_ASIGNAR);
  const [conductor, setConductor] = useState(SIN_ASIGNAR);
  const [estado, setEstado] = useState<string>("Nueva");
  const [prioridad, setPrioridad] = useState<string>("Media");
  const [organismo, setOrganismo] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [tipoDoc, setTipoDoc] = useState<string>(TIPOS_DOCUMENTO[0]!);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const crearMut = useCrearSancionManual(orgId, sesion?.userId, {
    vehicleId: vehiculo === SIN_ASIGNAR ? null : vehiculo,
    driverId: conductor === SIN_ASIGNAR ? null : conductor,
    status: estado,
    priority: prioridad,
    archivo,
    tipoDocumento: tipoDoc,
  });
  const crear = {
    isPending: crearMut.isPending,
    mutate: (form: FormData) => {
      const datos: DatosSancionManual = {
        reference_number: String(form.get("reference_number") ?? ""),
        sanctioning_authority: organismo,
        sanction_category: categoria,
        description: String(form.get("description") ?? ""),
        violation_date: String(form.get("violation_date") ?? ""),
        notification_date: String(form.get("notification_date") ?? ""),
        payment_deadline: String(form.get("payment_deadline") ?? ""),
        appeal_deadline: String(form.get("appeal_deadline") ?? ""),
        original_amount: String(form.get("original_amount") ?? "0"),
        discounted_amount: String(form.get("discounted_amount") ?? ""),
        points: String(form.get("points") ?? ""),
        notes: String(form.get("notes") ?? ""),
      };
      setErrores({});
      crearMut.mutate(datos, {
        onSuccess: (id) => {
          toast.success("Sanción registrada correctamente");
          navigate({ to: "/sanciones/$id", params: { id } });
        },
        onError: (e: Error) => {
          if (e instanceof ValidationError) setErrores(e.fieldErrors);
          toast.error(e.message);
        },
      });
    },
  };

  return (
    <AppShell titulo="Nueva sanción" descripcion="Registra un expediente sancionador">
      <Link
        to="/sanciones"
        className="mb-4 inline-flex items-center text-sm font-medium text-navy hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver al listado
      </Link>

      <div className="mb-6">
        <AltaDesdeDocumento orgId={orgId} userId={sesion?.userId} />
      </div>

      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Alta manual del expediente
        </h2>
        <p className="text-xs text-muted-foreground">
          Introduce o corrige los datos manualmente como alternativa al documento.
        </p>
      </div>

      {
        <form
          className="grid gap-6 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            crear.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="card-surface space-y-4 p-5 lg:col-span-2">
            <h2 className="text-base font-semibold">Datos del expediente</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Número de expediente" error={errores["reference_number"]}>
                <Input
                  name="reference_number"
                  maxLength={80}
                  placeholder="EXP-2026-000123"
                  required
                />
              </Campo>
              <Campo label="Organismo sancionador" error={errores["sanctioning_authority"]}>
                <Select value={organismo} onValueChange={setOrganismo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona organismo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANISMOS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Categoría de la infracción" error={errores["sanction_category"]}>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Puntos detraídos">
                <Input name="points" type="number" min={0} max={20} step={1} />
              </Campo>
              <Campo label="Fecha de la infracción">
                <Input name="violation_date" type="date" />
              </Campo>
              <Campo label="Fecha de notificación">
                <Input name="notification_date" type="date" />
              </Campo>
              <Campo label="Fecha límite de pago">
                <Input name="payment_deadline" type="date" />
              </Campo>
              <Campo label="Fecha límite de recurso">
                <Input name="appeal_deadline" type="date" />
              </Campo>
              <Campo label="Importe original (€)" error={errores["original_amount"]}>
                <Input name="original_amount" type="number" min={0} step="0.01" required />
              </Campo>
              <Campo label="Importe con reducción (€)">
                <Input name="discounted_amount" type="number" min={0} step="0.01" />
              </Campo>
            </div>
            <Campo label="Descripción de los hechos" error={errores["description"]}>
              <Textarea name="description" maxLength={1000} rows={4} />
            </Campo>
            <Campo label="Notas internas">
              <Textarea name="notes" maxLength={1000} rows={3} />
            </Campo>
          </div>

          <div className="space-y-6">
            <div className="card-surface space-y-4 p-5">
              <h2 className="text-base font-semibold">Asignación</h2>
              <Campo label="Vehículo">
                <Select value={vehiculo} onValueChange={setVehiculo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_ASIGNAR}>Sin asignar</SelectItem>
                    {(vehiculos ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registration_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Conductor">
                <Select value={conductor} onValueChange={setConductor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_ASIGNAR}>Sin asignar</SelectItem>
                    {(conductores ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Estado">
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_SANCION.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Prioridad">
                <Select value={prioridad} onValueChange={setPrioridad}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
            </div>
          </div>
        </form>
      }
    </AppShell>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

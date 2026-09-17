import { Controller, type UseFormReturn } from "react-hook-form";
import { CATEGORIAS, ESTADOS_SANCION, ORGANISMOS, PRIORIDADES } from "@sanciona/contracts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Campo } from "./Campo";
import { SIN_ASIGNAR, type ValoresFormulario } from "./formularioSancionManual.tipos";

type Vehiculo = { id: string; registration_number: string };
type Conductor = { id: string; full_name: string };

/**
 * Sección "Datos del expediente" del formulario manual: número, organismo,
 * categoría, fechas, importes y descripción/notas. Presentacional; recibe el
 * formulario react-hook-form y el helper de errores. Etapa 3.3.
 */
export function SeccionDatosExpediente({
  form,
  err,
}: {
  form: UseFormReturn<ValoresFormulario>;
  err: (campo: keyof ValoresFormulario) => string | undefined;
}) {
  return (
    <div className="card-surface space-y-4 p-5 lg:col-span-2">
      <h2 className="text-base font-semibold">Datos del expediente</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Número de expediente" error={err("reference_number")}>
          <Input
            {...form.register("reference_number")}
            maxLength={80}
            placeholder="EXP-2026-000123"
          />
        </Campo>
        <Campo label="Organismo sancionador" error={err("sanctioning_authority")}>
          <Controller
            control={form.control}
            name="sanctioning_authority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Campo>
        <Campo label="Categoría de la infracción" error={err("sanction_category")}>
          <Controller
            control={form.control}
            name="sanction_category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Campo>
        <Campo label="Puntos detraídos">
          <Input {...form.register("points")} type="number" min={0} max={20} step={1} />
        </Campo>
        <Campo label="Fecha de la infracción">
          <Input {...form.register("violation_date")} type="date" />
        </Campo>
        <Campo label="Fecha de notificación">
          <Input {...form.register("notification_date")} type="date" />
        </Campo>
        <Campo label="Fecha límite de pago">
          <Input {...form.register("payment_deadline")} type="date" />
        </Campo>
        <Campo label="Fecha límite de recurso">
          <Input {...form.register("appeal_deadline")} type="date" />
        </Campo>
        <Campo label="Importe original (€)" error={err("original_amount")}>
          <Input {...form.register("original_amount")} type="number" min={0} step="0.01" />
        </Campo>
        <Campo label="Importe con reducción (€)">
          <Input {...form.register("discounted_amount")} type="number" min={0} step="0.01" />
        </Campo>
      </div>
      <Campo label="Descripción de los hechos" error={err("description")}>
        <Textarea {...form.register("description")} maxLength={1000} rows={4} />
      </Campo>
      <Campo label="Notas internas">
        <Textarea {...form.register("notes")} maxLength={1000} rows={3} />
      </Campo>
    </div>
  );
}

/**
 * Sección "Asignación" del formulario manual: vehículo, conductor, estado y
 * prioridad. Presentacional. Etapa 3.3.
 */
export function SeccionAsignacion({
  form,
  vehiculos,
  conductores,
}: {
  form: UseFormReturn<ValoresFormulario>;
  vehiculos: Vehiculo[] | undefined;
  conductores: Conductor[] | undefined;
}) {
  return (
    <div className="space-y-6">
      <div className="card-surface space-y-4 p-5">
        <h2 className="text-base font-semibold">Asignación</h2>
        <Campo label="Vehículo">
          <Controller
            control={form.control}
            name="vehiculo"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Campo>
        <Campo label="Conductor">
          <Controller
            control={form.control}
            name="conductor"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Campo>
        <Campo label="Estado">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Campo>
        <Campo label="Prioridad">
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </Campo>
      </div>
    </div>
  );
}

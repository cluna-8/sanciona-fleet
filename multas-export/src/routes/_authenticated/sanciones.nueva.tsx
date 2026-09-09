import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { AltaDesdeDocumento } from "@/components/alta-documento";
import { useSesion } from "@/hooks/use-org";
import { useVehiculos, useConductores } from "@/hooks/use-datos";
import { supabase } from "@/integrations/supabase/client";
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
import { ESTADOS_SANCION, PRIORIDADES, CATEGORIAS, ORGANISMOS, TIPOS_DOCUMENTO } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/sanciones/nueva")({
  component: NuevaSancion,
});

const SIN_ASIGNAR = "__ninguno__";

const esquema = z.object({
  reference_number: z.string().trim().min(3, "Indica el número de expediente").max(80),
  sanctioning_authority: z.string().trim().min(1, "Selecciona el organismo").max(120),
  sanction_category: z.string().trim().min(1, "Selecciona la categoría").max(120),
  description: z.string().trim().max(1000).optional(),
  violation_date: z.string().max(10).optional(),
  notification_date: z.string().max(10).optional(),
  payment_deadline: z.string().max(10).optional(),
  appeal_deadline: z.string().max(10).optional(),
  original_amount: z.coerce.number().min(0, "Importe no válido").max(1_000_000),
  discounted_amount: z.coerce.number().min(0).max(1_000_000).optional(),
  points: z.coerce.number().min(0).max(20).optional(),
  status: z.string(),
  priority: z.string(),
  notes: z.string().trim().max(1000).optional(),
});

function NuevaSancion() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: vehiculos } = useVehiculos(orgId);
  const { data: conductores } = useConductores(orgId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [vehiculo, setVehiculo] = useState(SIN_ASIGNAR);
  const [conductor, setConductor] = useState(SIN_ASIGNAR);
  const [estado, setEstado] = useState<string>("Nueva");
  const [prioridad, setPrioridad] = useState<string>("Media");
  const [organismo, setOrganismo] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [tipoDoc, setTipoDoc] = useState<string>(TIPOS_DOCUMENTO[0]!);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const crear = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !sesion) throw new Error("Sesión no válida");
      const bruto = {
        reference_number: String(form.get("reference_number") ?? ""),
        sanctioning_authority: organismo,
        sanction_category: categoria,
        description: String(form.get("description") ?? ""),
        violation_date: String(form.get("violation_date") ?? ""),
        notification_date: String(form.get("notification_date") ?? ""),
        payment_deadline: String(form.get("payment_deadline") ?? ""),
        appeal_deadline: String(form.get("appeal_deadline") ?? ""),
        original_amount: String(form.get("original_amount") ?? "0"),
        discounted_amount: String(form.get("discounted_amount") ?? "") || undefined,
        points: String(form.get("points") ?? "") || undefined,
        status: estado,
        priority: prioridad,
        notes: String(form.get("notes") ?? ""),
      };
      const parsed = esquema.safeParse(bruto);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
        setErrores(errs);
        throw new Error("Revisa los campos marcados");
      }
      setErrores({});
      const d = parsed.data;

      const { data: sancion, error } = await supabase
        .from("sanctions")
        .insert({
          organization_id: orgId,
          reference_number: d.reference_number,
          sanctioning_authority: d.sanctioning_authority,
          sanction_category: d.sanction_category,
          description: d.description || null,
          violation_date: d.violation_date || null,
          notification_date: d.notification_date || null,
          payment_deadline: d.payment_deadline || null,
          appeal_deadline: d.appeal_deadline || null,
          original_amount: d.original_amount,
          discounted_amount: d.discounted_amount ?? null,
          points: d.points ?? null,
          vehicle_id: vehiculo === SIN_ASIGNAR ? null : vehiculo,
          driver_id: conductor === SIN_ASIGNAR ? null : conductor,
          status: d.status,
          priority: d.priority,
          notes: d.notes || null,
          created_by: sesion.userId,
        } as never)
        .select("id")
        .single();
      if (error) throw error;

      if (archivo) {
        const ruta = `${orgId}/${sancion.id}/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
        const { error: subida } = await supabase.storage
          .from("sanction-documents")
          .upload(ruta, archivo);
        if (subida) throw subida;
        await supabase.from("sanction_documents").insert({
          organization_id: orgId,
          sanction_id: sancion.id,
          document_type: tipoDoc,
          file_name: archivo.name,
          file_path: ruta,
          uploaded_by: sesion.userId,
        } as never);
      }

      await supabase.from("sanction_actions").insert({
        organization_id: orgId,
        sanction_id: sancion.id,
        action_type: "Registro del expediente",
        description: `Expediente ${d.reference_number} registrado en el sistema.`,
        performed_by: sesion.userId,
      } as never);

      return sancion.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["sanciones"] });
      toast.success("Sanción registrada correctamente");
      navigate({ to: "/sanciones/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

            <div className="card-surface space-y-4 p-5">
              <h2 className="text-base font-semibold">Documento adjunto (opcional)</h2>
              <Campo label="Tipo de documento">
                <Select value={tipoDoc} onValueChange={setTipoDoc}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Archivo (PDF, JPG o PNG, máx. 15 MB)">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > 15 * 1024 * 1024) {
                      toast.error("El archivo supera los 15 MB permitidos");
                      e.target.value = "";
                      setArchivo(null);
                      return;
                    }
                    setArchivo(f);
                  }}
                />
              </Campo>
            </div>

            <Button type="submit" className="w-full" disabled={crear.isPending}>
              {crear.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando expediente…
                </>
              ) : (
                "Registrar expediente"
              )}
            </Button>
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

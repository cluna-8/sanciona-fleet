import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { TIPOS_DOCUMENTO } from "@sanciona/contracts";
import { useVehiculos, useConductores } from "@/features/flota";
import { useSesion } from "@/hooks/use-org";
import { useCrearSancionManual, type DatosSancionManual } from "@/features/expedientes";
import { ValidationError } from "@/shared/lib/errores";
import { SeccionAsignacion, SeccionDatosExpediente } from "./SeccionesFormularioSancion";
import { SIN_ASIGNAR, type ValoresFormulario } from "./formularioSancionManual.tipos";

/**
 * Alta manual del expediente. Antes era la segunda mitad de
 * `routes/_authenticated/sanciones.nueva.tsx` (9 useState, FormData en crudo).
 * Ahora react-hook-form gestiona el estado; la validación la sigue haciendo el
 * server fn con el mismo Zod (`esquemaSancionManual`) y los errores se reflejan
 * inline (UI idéntica). Las secciones del formulario viven en
 * `SeccionesFormularioSancion.tsx`. Ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.3.
 */
export function FormularioSancionManual() {
  const navigate = useNavigate();
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const { data: vehiculos } = useVehiculos(orgId);
  const { data: conductores } = useConductores(orgId);

  const form = useForm<ValoresFormulario>({
    defaultValues: {
      reference_number: "",
      sanctioning_authority: "",
      sanction_category: "",
      description: "",
      violation_date: "",
      notification_date: "",
      payment_deadline: "",
      appeal_deadline: "",
      original_amount: "",
      discounted_amount: "",
      points: "",
      status: "Nueva",
      priority: "Media",
      notes: "",
      vehiculo: SIN_ASIGNAR,
      conductor: SIN_ASIGNAR,
    },
  });

  const vehiculo = form.watch("vehiculo");
  const conductor = form.watch("conductor");
  const estado = form.watch("status");
  const prioridad = form.watch("priority");

  const crearMut = useCrearSancionManual(orgId, sesion?.userId, {
    vehicleId: vehiculo === SIN_ASIGNAR ? null : vehiculo,
    driverId: conductor === SIN_ASIGNAR ? null : conductor,
    status: estado,
    priority: prioridad,
    archivo: null,
    tipoDocumento: TIPOS_DOCUMENTO[0]!,
  });

  function onSubmit(val: ValoresFormulario) {
    const datos: DatosSancionManual = {
      reference_number: val.reference_number,
      sanctioning_authority: val.sanctioning_authority,
      sanction_category: val.sanction_category,
      description: val.description,
      violation_date: val.violation_date,
      notification_date: val.notification_date,
      payment_deadline: val.payment_deadline,
      appeal_deadline: val.appeal_deadline,
      original_amount: val.original_amount,
      discounted_amount: val.discounted_amount,
      points: val.points,
      notes: val.notes,
    };
    crearMut.mutate(datos, {
      onSuccess: (id) => {
        toast.success("Sanción registrada correctamente");
        navigate({ to: "/sanciones/$id", params: { id } });
      },
      onError: (e: Error) => {
        if (e instanceof ValidationError) {
          for (const [campo, mensaje] of Object.entries(e.fieldErrors)) {
            form.setError(campo as keyof ValoresFormulario, { message: mensaje });
          }
        }
        toast.error(e.message);
      },
    });
  }

  const err = (campo: keyof ValoresFormulario) => form.formState.errors[campo]?.message;

  return (
    <form
      className="grid gap-6 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit(onSubmit)(e);
      }}
    >
      <SeccionDatosExpediente form={form} err={err} />
      <SeccionAsignacion form={form} vehiculos={vehiculos} conductores={conductores} />
    </form>
  );
}

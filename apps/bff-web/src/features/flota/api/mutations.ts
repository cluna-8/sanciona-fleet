import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ValidationError } from "@/shared/lib/errores";
import { flotaKeys } from "./keys";
import { esquemaVehiculo, esquemaConductor } from "../model/schemas";
import {
  crearVehiculo,
  actualizarVehiculo,
  crearConductor,
  actualizarConductor,
  type CambiosVehiculo,
  type CambiosConductor,
} from "./client";

function parsearOFallar<T>(
  esquema: { safeParse: (v: unknown) => import("zod").SafeParseReturnType<unknown, T> },
  form: FormData,
  campos: string[],
): T {
  const bruto: Record<string, string> = {};
  for (const c of campos) bruto[c] = String(form.get(c) ?? "");
  const parsed = esquema.safeParse(bruto);
  if (!parsed.success) {
    const errores: Record<string, string> = {};
    for (const i of parsed.error.issues) errores[String(i.path[0])] = i.message;
    throw new ValidationError(errores);
  }
  return parsed.data;
}

export function useCrearVehiculo(orgId: string | undefined, tipo: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Sesión no válida");
      const d = parsearOFallar(esquemaVehiculo, form, [
        "registration_number",
        "internal_code",
        "brand",
        "model",
      ]);
      await crearVehiculo({
        organization_id: orgId,
        registration_number: d.registration_number.toUpperCase(),
        internal_code: d.internal_code || null,
        brand: d.brand || null,
        model: d.model || null,
        vehicle_type: tipo,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flotaKeys.vehiculos(orgId) }),
  });
}

export function useActualizarVehiculo(
  orgId: string | undefined,
  id: string,
  tipo: string,
  estado: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => {
      const d = parsearOFallar(esquemaVehiculo, form, [
        "registration_number",
        "internal_code",
        "brand",
        "model",
      ]);
      const cambios: CambiosVehiculo = {
        registration_number: d.registration_number.toUpperCase(),
        internal_code: d.internal_code || null,
        brand: d.brand || null,
        model: d.model || null,
        vehicle_type: tipo,
        status: estado,
      };
      await actualizarVehiculo(id, cambios);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flotaKeys.vehiculos(orgId) }),
  });
}

export function useCrearConductor(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Sesión no válida");
      const d = parsearOFallar(esquemaConductor, form, [
        "full_name",
        "identification_number",
        "email",
        "phone",
      ]);
      await crearConductor({
        organization_id: orgId,
        full_name: d.full_name,
        identification_number: d.identification_number || null,
        email: d.email || null,
        phone: d.phone || null,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flotaKeys.conductores(orgId) }),
  });
}

export function useActualizarConductor(orgId: string | undefined, id: string, estado: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => {
      const d = parsearOFallar(esquemaConductor, form, [
        "full_name",
        "identification_number",
        "email",
        "phone",
      ]);
      const cambios: CambiosConductor = {
        full_name: d.full_name,
        identification_number: d.identification_number || null,
        email: d.email || null,
        phone: d.phone || null,
        status: estado,
      };
      await actualizarConductor(id, cambios);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: flotaKeys.conductores(orgId) }),
  });
}

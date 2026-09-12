import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ValidationError } from "@/shared/lib/errores";
import { subirDocumento, registrarDocumento, rutaDocumento } from "@/features/documentos";
import { expedientesKeys } from "./keys";
import { esquemaSancionManual } from "../model/schemas";
import {
  cambiarEstadoSancion,
  añadirComentario,
  registrarActuacion,
  crearSancionManual,
} from "./client";

export function useCambiarEstado(
  orgId: string | undefined,
  userId: string | undefined,
  id: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: string) => {
      if (!orgId || !userId) throw new Error("Sesión no válida");
      await cambiarEstadoSancion(id, orgId, userId, nuevo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expedientesKeys.detalle(id) });
      queryClient.invalidateQueries({ queryKey: expedientesKeys.actuaciones(id) });
      queryClient.invalidateQueries({ queryKey: expedientesKeys.lista(orgId) });
    },
  });
}

export function useAñadirComentario(
  orgId: string | undefined,
  userId: string | undefined,
  id: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (texto: string) => {
      const limpio = texto.trim();
      if (!limpio) throw new Error("El comentario no puede estar vacío");
      if (limpio.length > 1000) throw new Error("Máximo 1000 caracteres");
      if (!orgId || !userId) throw new Error("Sesión no válida");
      await añadirComentario(orgId, id, userId, limpio);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expedientesKeys.comentarios(id) }),
  });
}

export type DatosSancionManual = {
  reference_number: string;
  sanctioning_authority: string;
  sanction_category: string;
  description: string;
  violation_date: string;
  notification_date: string;
  payment_deadline: string;
  appeal_deadline: string;
  original_amount: string;
  discounted_amount: string;
  points: string;
  notes: string;
};

export function useCrearSancionManual(
  orgId: string | undefined,
  userId: string | undefined,
  opciones: {
    vehicleId: string | null;
    driverId: string | null;
    status: string;
    priority: string;
    archivo: File | null;
    tipoDocumento: string;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: DatosSancionManual): Promise<string> => {
      if (!orgId || !userId) throw new Error("Sesión no válida");
      const parsed = esquemaSancionManual.safeParse({
        ...datos,
        discounted_amount: datos.discounted_amount || undefined,
        points: datos.points || undefined,
        status: opciones.status,
        priority: opciones.priority,
      });
      if (!parsed.success) {
        const errores: Record<string, string> = {};
        for (const i of parsed.error.issues) errores[String(i.path[0])] = i.message;
        throw new ValidationError(errores);
      }
      const d = parsed.data;
      const sancionId = await crearSancionManual({
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
        vehicle_id: opciones.vehicleId,
        driver_id: opciones.driverId,
        status: d.status,
        priority: d.priority,
        notes: d.notes || null,
        created_by: userId,
      });

      if (opciones.archivo) {
        const ruta = rutaDocumento(orgId, sancionId, opciones.archivo.name);
        await subirDocumento(ruta, opciones.archivo);
        await registrarDocumento({
          organization_id: orgId,
          sanction_id: sancionId,
          document_type: opciones.tipoDocumento,
          file_name: opciones.archivo.name,
          file_path: ruta,
          uploaded_by: userId,
        });
      }

      await registrarActuacion(
        orgId,
        sancionId,
        userId,
        "Registro del expediente",
        `Expediente ${d.reference_number} registrado en el sistema.`,
      );

      return sancionId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: expedientesKeys.lista(orgId) }),
  });
}

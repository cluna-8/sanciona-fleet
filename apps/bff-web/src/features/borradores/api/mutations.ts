import { useMutation, useQueryClient } from "@tanstack/react-query";
import { borradoresKeys } from "./queries";
import { guardarNuevaVersion, cambiarEstadoBorrador, type BorradorConSancion } from "./client";

export function useGuardarVersion(
  draftId: string,
  borrador: BorradorConSancion | null | undefined,
  organizationId: string | undefined,
  userId: string | undefined,
  ultimaVersion: number,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ texto, nota }: { texto: string; nota: string }) => {
      if (!borrador || !userId) throw new Error("Sesión no válida");
      if (texto.trim().length < 50) throw new Error("El escrito es demasiado breve");
      await guardarNuevaVersion({
        organizationId,
        draftId,
        sanctionId: borrador.sanction_id,
        version: ultimaVersion + 1,
        content: texto,
        changeNote: nota || "Edición manual del escrito.",
        userId,
        draftTitle: borrador.title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: borradoresKeys.versiones(draftId) });
      queryClient.invalidateQueries({ queryKey: borradoresKeys.detalle(draftId) });
    },
  });
}

export function useCambiarEstadoBorrador(
  draftId: string,
  borrador: BorradorConSancion | null | undefined,
  organizationId: string | undefined,
  userId: string | undefined,
  esRevisor: boolean,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (estado: string) => {
      if (!borrador || !userId) throw new Error("Sesión no válida");
      if (estado === "Validado" && !esRevisor) {
        throw new Error("Solo un revisor jurídico puede validar el escrito");
      }
      await cambiarEstadoBorrador({
        organizationId,
        draftId,
        sanctionId: borrador.sanction_id,
        draftTitle: borrador.title,
        userId,
        estado,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: borradoresKeys.detalle(draftId) });
      queryClient.invalidateQueries({ queryKey: borradoresKeys.deSancion(borrador?.sanction_id) });
    },
  });
}

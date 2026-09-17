import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { analizarExpediente, generarBorrador, recalcularPlazos } from "@/lib/expediente.functions";
import { revisarAnalisis, type CambiosRevision, type Analisis } from "./client";

/**
 * Invalida las queries que una acción de análisis toca: el propio análisis, los
 * plazos, los borradores, la sanción y su historial de actuaciones. Es la
 * invalidación `por prefijo` que antes vivía como `invalidar` local en
 * panel-analisis.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
function useInvalidacion(sanctionId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["analisis", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["plazos", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["borradores", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["sancion", sanctionId] });
    queryClient.invalidateQueries({ queryKey: ["sancion-actions", sanctionId] });
  };
}

/** Lanza (o repite) el análisis IA de un expediente. */
export function useAnalizarExpediente(sanctionId: string) {
  const invalidar = useInvalidacion(sanctionId);
  const fn = useServerFn(analizarExpediente);
  return useMutation({
    mutationFn: () => fn({ data: { sanctionId } }),
    onSuccess: () => {
      invalidar();
      toast.success("Análisis del expediente completado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Genera un borrador de alegaciones o de recurso para un expediente. */
export function useGenerarBorrador(sanctionId: string) {
  const invalidar = useInvalidacion(sanctionId);
  const fn = useServerFn(generarBorrador);
  return useMutation({
    mutationFn: (kind: "Alegaciones" | "Recurso") => fn({ data: { sanctionId, kind } }),
    onSuccess: () => {
      invalidar();
      toast.success("Borrador generado. Requiere revisión y validación.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Recalcula los plazos de un expediente a partir de los datos actuales. */
export function useRecalcularPlazos(sanctionId: string) {
  const invalidar = useInvalidacion(sanctionId);
  const fn = useServerFn(recalcularPlazos);
  return useMutation({
    mutationFn: () => fn({ data: { sanctionId } }),
    onSuccess: () => {
      invalidar();
      toast.success("Plazos recalculados");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Registra la revisión jurídica de un análisis (recomendación, observaciones,
 * validación). Antes sólo invalidaba el análisis; ahora aplica la invalidación
 * `por prefijo` y el toast que hacía el wrapper `revisar` en panel-analisis.tsx
 * — comportamiento neto idéntico.
 */
export function useRevisarAnalisis(
  sanctionId: string,
  analisis: Analisis | null | undefined,
  userId: string | undefined,
) {
  const invalidar = useInvalidacion(sanctionId);
  return useMutation({
    mutationFn: async (cambios: CambiosRevision) => {
      if (!analisis) throw new Error("No hay análisis que revisar");
      await revisarAnalisis(analisis.id, cambios, userId);
    },
    onSuccess: () => {
      invalidar();
      toast.success("Revisión registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analisisKeys } from "./queries";
import { revisarAnalisis, type CambiosRevision, type Analisis } from "./client";

export function useRevisarAnalisis(
  sanctionId: string,
  analisis: Analisis | null | undefined,
  userId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cambios: CambiosRevision) => {
      if (!analisis) throw new Error("No hay análisis que revisar");
      await revisarAnalisis(analisis.id, cambios, userId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: analisisKeys.deSancion(sanctionId) }),
  });
}

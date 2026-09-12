import { useMutation, useQueryClient } from "@tanstack/react-query";
import { marcarAvisosLeidos } from "./client";

export function useMarcarAvisosLeidos(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | null) => {
      if (!orgId) throw new Error("Sesión no válida");
      await marcarAvisosLeidos(orgId, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["avisos"] }),
  });
}

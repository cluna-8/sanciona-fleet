import { toast } from "sonner";
import { useCambiarEstado } from "@/features/expedientes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_SANCION } from "@sanciona/contracts";

/**
 * Selector de estado de un expediente que va en el slot `acciones` de `AppShell`.
 * Antes era el `Select` inline en el header de `FichaSancion` — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.2. Posee su mutación `useCambiarEstado`.
 */
export function SelectorEstado({
  orgId,
  userId,
  sancionId,
  estado,
}: {
  orgId: string | undefined;
  userId: string | undefined;
  sancionId: string;
  estado: string;
}) {
  const cambiarEstado = useCambiarEstado(orgId, userId, sancionId);
  const enviarCambioEstado = (nuevo: string) => {
    cambiarEstado.mutate(nuevo, {
      onSuccess: () => toast.success("Estado actualizado"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="w-56">
      <Select value={estado} onValueChange={enviarCambioEstado}>
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
    </div>
  );
}

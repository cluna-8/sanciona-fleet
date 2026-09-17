import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Bloque } from "@/shared/components/Bloque";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRevisarAnalisis, type Analisis } from "@/features/analisis";
import { RECOMENDACIONES } from "@/lib/analisis";

/**
 * Revisión jurídica del análisis: única sección con interacción (cambio de
 * recomendación, observaciones del revisor, validación). Posee su estado
 * `notaRevision` y su mutación `useRevisarAnalisis`. Antes era el bloque
 * `Revisión jurídica` inline en panel-analisis.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.4.
 */
export function RevisionJuridica({
  sanctionId,
  analisis,
  userId,
  esRevisor,
}: {
  sanctionId: string;
  analisis: Analisis;
  userId?: string | undefined;
  esRevisor: boolean;
}) {
  const [notaRevision, setNotaRevision] = useState("");
  const revisar = useRevisarAnalisis(sanctionId, analisis, userId);

  if (!esRevisor) return null;

  return (
    <Bloque titulo="Revisión jurídica">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Recomendación</Label>
        <Select
          value={analisis.recommendation ?? "Revisar"}
          onValueChange={(v) => revisar.mutate({ recommendation: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECOMENDACIONES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="text-xs text-muted-foreground">Observaciones del revisor</Label>
        <Textarea
          rows={3}
          maxLength={1500}
          value={notaRevision || (analisis.review_notes ?? "")}
          onChange={(e) => setNotaRevision(e.target.value)}
          placeholder="Argumentos añadidos, matices o motivos de la modificación…"
        />
        <Button
          size="sm"
          onClick={() => revisar.mutate({ review_notes: notaRevision, validar: true })}
          disabled={revisar.isPending}
        >
          {revisar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar revisión jurídica
        </Button>
      </div>
    </Bloque>
  );
}

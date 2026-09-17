import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/**
 * Etiqueta + control + mensaje de error opcional. Helper de presentación del
 * formulario manual de sanción (Etapa 3.3).
 */
export function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DatosAlta } from "@/features/alta";

/**
 * Paso 1 del alta: datos de la empresa. Antes era el bloque `pasoAlta === 0`
 * inline en routes/index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.7.
 */
export function PasoDatosEmpresa({
  datos,
  errores,
  onEnviar,
}: {
  datos: DatosAlta | null;
  errores: Record<string, string>;
  onEnviar: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="space-y-4 border border-border p-6">
      <h2 className="font-display text-lg font-semibold">Datos de la empresa</h2>
      <form onSubmit={onEnviar} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" name="email" type="email" required defaultValue={datos?.email} />
          <p className="text-xs text-muted-foreground">
            Aquí enviaremos el usuario y la contraseña de acceso.
          </p>
          {errores["email"] && <p className="text-xs text-destructive">{errores["email"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contacto">Persona de contacto</Label>
          <Input id="contacto" name="contacto" required defaultValue={datos?.contacto} />
          {errores["contacto"] && <p className="text-xs text-destructive">{errores["contacto"]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="empresa">Nombre de la empresa</Label>
          <Input id="empresa" name="empresa" required defaultValue={datos?.empresa} />
          {errores["empresa"] && <p className="text-xs text-destructive">{errores["empresa"]}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cif">CIF</Label>
            <Input id="cif" name="cif" defaultValue={datos?.cif} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={datos?.telefono} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="provincia">Provincia</Label>
          <Input id="provincia" name="provincia" defaultValue={datos?.provincia} />
        </div>
        <Button type="submit" className="w-full">
          Continuar a las tarifas <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

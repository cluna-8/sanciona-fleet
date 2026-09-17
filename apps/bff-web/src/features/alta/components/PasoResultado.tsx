import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResultadoAlta } from "@/features/alta";

/**
 * Paso 3 del alta: confirmación con las credenciales generadas. Antes era el
 * bloque `pasoAlta === 2` inline en routes/index.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.7.
 */
export function PasoResultado({
  resultado,
  onIrLogin,
}: {
  resultado: ResultadoAlta;
  onIrLogin: () => void;
}) {
  return (
    <section className="mx-auto max-w-lg border border-border p-6 text-center">
      <Mail className="mx-auto h-10 w-10 text-accent" />
      <h2 className="mt-4 font-display text-2xl font-bold">Alta completada</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {resultado.correoEnviado
          ? `Hemos enviado tus datos de acceso a ${resultado.email}.`
          : "Tu cuenta ya está creada. Guarda estos datos de acceso: el envío por correo aún no está activado."}
      </p>
      <dl className="mt-6 space-y-3 border border-border p-4 text-left text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Usuario</dt>
          <dd className="font-mono font-semibold">{resultado.usuario}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Correo de acceso</dt>
          <dd className="font-semibold">{resultado.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Contraseña</dt>
          <dd className="font-mono font-semibold">{resultado.password}</dd>
        </div>
      </dl>
      {!resultado.correoEnviado && resultado.motivoCorreo && (
        <p className="mt-3 text-xs text-muted-foreground">{resultado.motivoCorreo}</p>
      )}
      <Button className="mt-6 w-full" onClick={onIrLogin}>
        Ir a iniciar sesión
      </Button>
    </section>
  );
}

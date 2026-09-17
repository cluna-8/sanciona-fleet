import { useEffect, useRef } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { obtenerSesionActual, suscribirCambiosAuth } from "@/features/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormularioLogin } from "@/features/auth/components/FormularioLogin";
import { AsistenteAlta } from "@/features/alta/components/AsistenteAlta";

/**
 * Página de acceso (login + alta). Antes era `PaginaInicio` (534 líneas, 6
 * useState) en routes/index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md
 * §3.7. Posee el redirect de sesión y la ref `registrando` (coordinación con el
 * alta para no disparar el redirect durante el registro). Los formularios viven
 * en <FormularioLogin> y <AsistenteAlta>. SPEC §3.10 pendiente.
 */
export function PaginaAcceso() {
  const navigate = useNavigate();
  const registrando = useRef(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const errorDesc = hash.get("error_description") ?? query.get("error_description");
    const errorCode = hash.get("error_code") ?? query.get("error_code");
    if (errorDesc || errorCode) {
      toast.error("No se ha podido confirmar el correo", {
        description:
          errorCode === "otp_expired"
            ? "El enlace ha caducado o ya se ha usado. Inicia sesión o vuelve a darte de alta para recibir uno nuevo."
            : (errorDesc ?? "Enlace de confirmación no válido."),
      });
      window.history.replaceState({}, "", "/");
      return;
    }

    obtenerSesionActual().then((session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return suscribirCambiosAuth((_e, session) => {
      if (session && !registrando.current) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy p-10 text-navy-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-accent" />
          <span className="font-display text-lg font-bold">Sanciona Fleet</span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Control total de las sanciones de tu flota
          </h2>
          <p className="mt-4 text-navy-foreground/70">
            Centraliza expedientes, plazos, documentos y actuaciones. Evita recargos por vencimiento
            y aprovecha las reducciones por pronto pago.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-navy-foreground/80">
            <li>· Expedientes vinculados a vehículos y conductores</li>
            <li>· Avisos de plazos de pago y de recurso</li>
            <li>· Documentación almacenada de forma privada</li>
            <li>· Separación total de datos entre empresas</li>
          </ul>
        </div>
        <p className="text-xs text-navy-foreground/50">
          Datos alojados en la Unión Europea · Acceso por roles
        </p>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <span className="font-display text-lg font-bold">Sanciona Fleet</span>
          </div>

          <Tabs defaultValue="acceder">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="acceder">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="registro">Darse de alta</TabsTrigger>
            </TabsList>

            <TabsContent value="acceder" className="mt-6">
              <FormularioLogin />
            </TabsContent>

            <TabsContent value="registro" className="mt-6">
              <AsistenteAlta registrando={registrando} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

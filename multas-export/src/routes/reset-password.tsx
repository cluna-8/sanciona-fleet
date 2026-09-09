import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña · Sanciona Fleet" },
      {
        name: "description",
        content: "Establece una nueva contraseña para tu cuenta de Sanciona Fleet.",
      },
      { property: "og:title", content: "Restablecer contraseña · Sanciona Fleet" },
      { property: "og:description", content: "Establece una nueva contraseña para tu cuenta." },
    ],
  }),
  component: PaginaResetPassword,
});

const esquema = z
  .object({
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }).max(72),
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });

function PaginaResetPassword() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [enlaceValido, setEnlaceValido] = useState<boolean | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    // Supabase añade type=recovery al hash cuando el enlace es válido
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") {
      setEnlaceValido(true);
      return;
    }
    // Si el cliente ya procesó el token, habrá sesión de recuperación activa
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setEnlaceValido(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setEnlaceValido((v) => v ?? Boolean(data.session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = esquema.safeParse({
      password: form.get("password"),
      confirmar: form.get("confirmar"),
    });
    if (!parsed.success) {
      setErrores(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrores({});
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setCargando(false);
    if (error) {
      toast.error("No se ha podido actualizar la contraseña", { description: error.message });
      return;
    }
    toast.success("Contraseña actualizada", {
      description: "Ya puedes acceder con tu nueva contraseña.",
    });
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <span className="font-display text-lg font-bold">Sanciona Fleet</span>
        </div>

        {enlaceValido === false ? (
          <div>
            <h1 className="font-display text-2xl font-bold">Enlace no válido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              El enlace de recuperación ha caducado o ya se ha utilizado. Solicita uno nuevo desde la
              página de acceso.
            </p>
            <Link to="/auth" className="mt-6 inline-block">
              <Button>Volver a acceso</Button>
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-2xl font-bold">Establece tu nueva contraseña</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Introduce y confirma tu nueva contraseña.
            </p>
            <form onSubmit={guardar} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password-nueva">Nueva contraseña</Label>
                <Input
                  id="password-nueva"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                {errores["password"] ? (
                  <p className="text-xs text-destructive">{errores["password"]}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-confirmar">Confirmar contraseña</Label>
                <Input
                  id="password-confirmar"
                  name="confirmar"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                {errores["confirmar"] && (
                  <p className="text-xs text-destructive">{errores["confirmar"]}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={cargando || enlaceValido === null}>
                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar contraseña
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

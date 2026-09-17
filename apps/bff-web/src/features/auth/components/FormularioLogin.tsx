import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { iniciarSesionConPassword, solicitarRestablecerContrasena } from "@/features/auth";
import { resolverIdentificador } from "@/lib/login.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const esquemaAcceso = z.object({
  identificador: z
    .string()
    .trim()
    .min(2, { message: "Introduce tu usuario o correo electrónico" })
    .max(255),
  password: z
    .string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .max(72),
});

/**
 * Pestaña de inicio de sesión: formulario de acceso + sub-form de recuperación
 * de contraseña. Antes era el `TabsContent value="acceder"` inline en
 * routes/index.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.7.
 * SPEC §3.10 pendiente (no corregir hallazgos 1–5 de CAMBIOS-LOVABLE.md).
 */
export function FormularioLogin() {
  const navigate = useNavigate();
  const resolver = useServerFn(resolverIdentificador);

  const [cargando, setCargando] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = esquemaAcceso.safeParse({
      identificador: form.get("identificador"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setErrores(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrores({});
    setCargando(true);
    const resuelto = await resolver({ data: { identificador: parsed.data.identificador } }).catch(
      () => null,
    );
    const email = resuelto?.email ?? null;
    if (!email) {
      setCargando(false);
      toast.error("No se ha podido iniciar sesión", {
        description: "Usuario o contraseña incorrectos.",
      });
      return;
    }
    const { error } = await iniciarSesionConPassword(email, parsed.data.password);
    setCargando(false);
    if (error) {
      toast.error("No se ha podido iniciar sesión", {
        description:
          error === "Invalid login credentials" ? "Usuario o contraseña incorrectos." : error,
      });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function recuperar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = z
      .string()
      .trim()
      .email({ message: "Introduce un correo electrónico válido" })
      .safeParse(form.get("email"));
    if (!parsed.success) {
      setErrores({ emailRecuperar: parsed.error.issues[0]?.message ?? "Correo no válido" });
      return;
    }
    setErrores({});
    setCargando(true);
    const { error } = await solicitarRestablecerContrasena(
      parsed.data,
      `${window.location.origin}/reset-password`,
    );
    setCargando(false);
    if (error) {
      toast.error("No se ha podido enviar el correo", { description: error });
      return;
    }
    toast.success("Correo enviado", {
      description: "Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.",
    });
    setMostrarRecuperar(false);
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Accede a tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Introduce tus credenciales corporativas.</p>
      <form onSubmit={entrar} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="usuario-acceso">Usuario o correo electrónico</Label>
          <Input
            id="usuario-acceso"
            name="identificador"
            type="text"
            autoComplete="username"
            placeholder="tuusuario1234 o correo@empresa.com"
            required
          />
          {errores["identificador"] && (
            <p className="text-xs text-destructive">{errores["identificador"]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password-acceso">Contraseña</Label>
          <Input
            id="password-acceso"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {errores["password"] && <p className="text-xs text-destructive">{errores["password"]}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={cargando}>
          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setMostrarRecuperar(true)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          ¿Has olvidado la contraseña?
        </button>
      </div>
      {mostrarRecuperar && (
        <form onSubmit={recuperar} className="mt-4 space-y-3 rounded-md border border-border p-4">
          <p className="text-sm font-medium">Recuperar contraseña</p>
          <p className="text-xs text-muted-foreground">
            Te enviaremos un correo con un enlace para establecer una nueva contraseña.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email-recuperar">Correo electrónico</Label>
            <Input id="email-recuperar" name="email" type="email" autoComplete="email" required />
            {errores["emailRecuperar"] && (
              <p className="text-xs text-destructive">{errores["emailRecuperar"]}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={cargando}>
              {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar enlace
            </Button>
            <Button type="button" variant="outline" onClick={() => setMostrarRecuperar(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

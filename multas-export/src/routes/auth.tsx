import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceder · Sanciona Fleet" },
      {
        name: "description",
        content: "Accede a Sanciona Fleet para gestionar las sanciones de tu flota de transporte.",
      },
      { property: "og:title", content: "Acceder · Sanciona Fleet" },
      {
        property: "og:description",
        content: "Acceso seguro al gestor de sanciones para empresas de transporte.",
      },
    ],
  }),
  component: PaginaAuth,
});

const esquemaAcceso = z.object({
  email: z.string().trim().email({ message: "Introduce un correo electrónico válido" }).max(255),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }).max(72),
});

const esquemaRegistro = esquemaAcceso.extend({
  fullName: z.string().trim().min(2, { message: "Indica tu nombre completo" }).max(100),
});

function PaginaAuth() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
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
            ? "El enlace ha caducado o ya se ha usado. Inicia sesión o vuelve a registrarte para recibir uno nuevo."
            : (errorDesc ?? "Enlace de confirmación no válido."),
      });
      window.history.replaceState({}, "", "/auth");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !registrando.current) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = esquemaAcceso.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setErrores(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrores({});
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setCargando(false);
    if (error) {
      toast.error("No se ha podido iniciar sesión", {
        description:
          error.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : error.message,
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
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setCargando(false);
    if (error) {
      toast.error("No se ha podido enviar el correo", { description: error.message });
      return;
    }
    toast.success("Correo enviado", {
      description: "Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.",
    });
    setMostrarRecuperar(false);
  }

  async function registrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = esquemaRegistro.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setErrores(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrores({});
    setCargando(true);
    registrando.current = true;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setCargando(false);
    if (error) {
      registrando.current = false;
      toast.error("No se ha podido crear la cuenta", { description: error.message });
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        localStorage.removeItem("sanciona-tutorial-visto");
      } catch {
        /* almacenamiento no disponible */
      }
      navigate({ to: "/tutorial", replace: true });
    } else {
      toast.success("Cuenta creada", {
        description: "Revisa tu correo para confirmar la dirección y después inicia sesión.",
      });
    }
  }

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
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <span className="font-display text-lg font-bold">Sanciona Fleet</span>
          </div>
          <Tabs defaultValue="acceder">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="acceder">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="registro">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="acceder" className="mt-6">
              <h1 className="font-display text-2xl font-bold">Accede a tu cuenta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Introduce tus credenciales corporativas.
              </p>
              <form onSubmit={entrar} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-acceso">Correo electrónico</Label>
                  <Input id="email-acceso" name="email" type="email" autoComplete="email" required />
                  {errores["email"] && <p className="text-xs text-destructive">{errores["email"]}</p>}
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
            </TabsContent>

            <TabsContent value="registro" className="mt-6">
              <h1 className="font-display text-2xl font-bold">Crea tu cuenta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Después podrás dar de alta tu empresa y empezar desde cero.
              </p>
              <form onSubmit={registrar} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre y apellidos</Label>
                  <Input id="nombre" name="fullName" maxLength={100} required />
                  {errores["fullName"] && <p className="text-xs text-destructive">{errores["fullName"]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-registro">Correo electrónico</Label>
                  <Input id="email-registro" name="email" type="email" autoComplete="email" required />
                  {errores["email"] && <p className="text-xs text-destructive">{errores["email"]}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-registro">Contraseña</Label>
                  <Input
                    id="password-registro"
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
                <Button type="submit" className="w-full" disabled={cargando}>
                  {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Check, Loader2, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  obtenerSesionActual,
  suscribirCambiosAuth,
  iniciarSesionConPassword,
  solicitarRestablecerContrasena,
} from "@/features/auth";
import { crearAlta } from "@/lib/alta.functions";
import { PLANES } from "@/lib/planes";
import { resolverIdentificador } from "@/lib/login.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const esquemaBusqueda = z.object({
  tab: z.enum(["acceder", "registro"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: esquemaBusqueda,
  head: () => ({
    meta: [
      { title: "Acceder · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Accede o date de alta en Sanciona Fleet para gestionar las sanciones de tu flota de transporte.",
      },
      { property: "og:title", content: "Acceder · Sanciona Fleet" },
      {
        property: "og:description",
        content:
          "Inicia sesión o date de alta en el gestor de sanciones para empresas de transporte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaAcceso,
});

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

const esquemaDatos = z.object({
  email: z.string().trim().email({ message: "Introduce un correo electrónico válido" }).max(255),
  contacto: z.string().trim().min(2, { message: "Indica la persona de contacto" }).max(120),
  empresa: z.string().trim().min(2, { message: "Indica el nombre de la empresa" }).max(150),
  cif: z.string().trim().max(20),
  telefono: z.string().trim().max(30),
  provincia: z.string().trim().max(80),
});

type Datos = z.infer<typeof esquemaDatos>;

const PASOS = ["Tus datos", "Tarifa", "Acceso"];

function PaginaAcceso() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const resolver = useServerFn(resolverIdentificador);
  const alta = useServerFn(crearAlta);

  const [cargando, setCargando] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const registrando = useRef(false);

  const [pasoAlta, setPasoAlta] = useState(0);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [resultado, setResultado] = useState<{
    usuario: string;
    email: string;
    password: string;
    correoEnviado: boolean;
    motivoCorreo: string | null;
  } | null>(null);

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
      window.history.replaceState({}, "", "/auth");
      return;
    }

    obtenerSesionActual().then((session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return suscribirCambiosAuth((_e, session) => {
      if (session && !registrando.current) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

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

  function enviarDatos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = esquemaDatos.safeParse({
      email: form.get("email"),
      contacto: form.get("contacto"),
      empresa: form.get("empresa"),
      cif: form.get("cif") ?? "",
      telefono: form.get("telefono") ?? "",
      provincia: form.get("provincia") ?? "",
    });
    if (!parsed.success) {
      setErrores(
        Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
      );
      return;
    }
    setErrores({});
    setDatos(parsed.data);
    setPasoAlta(1);
  }

  async function contratar(planId: string, planNombre: string) {
    if (!datos) return;
    setCargando(true);
    registrando.current = true;
    try {
      const res = await alta({
        data: { ...datos, plan: planId as "basico" | "pro" | "empresa", planNombre },
      });
      if (!res.ok) {
        toast.error("No se ha podido completar el alta", { description: res.error });
        return;
      }
      setResultado({
        usuario: res.usuario,
        email: res.email,
        password: res.password,
        correoEnviado: res.correoEnviado,
        motivoCorreo: res.motivoCorreo,
      });
      setPasoAlta(2);
    } catch {
      toast.error("No se ha podido completar el alta", {
        description: "Inténtalo de nuevo en unos minutos.",
      });
    } finally {
      setCargando(false);
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
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <span className="font-display text-lg font-bold">Sanciona Fleet</span>
          </div>

          <Tabs
            value={tab === "registro" ? "registro" : "acceder"}
            onValueChange={(v) =>
              navigate({ to: "/auth", search: { tab: v as "acceder" | "registro" }, replace: true })
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="acceder">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="registro">Darse de alta</TabsTrigger>
            </TabsList>

            <TabsContent value="acceder" className="mt-6">
              <h1 className="font-display text-2xl font-bold">Accede a tu cuenta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Introduce tus credenciales corporativas.
              </p>
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
                  {errores["password"] && (
                    <p className="text-xs text-destructive">{errores["password"]}</p>
                  )}
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
                <form
                  onSubmit={recuperar}
                  className="mt-4 space-y-3 rounded-md border border-border p-4"
                >
                  <p className="text-sm font-medium">Recuperar contraseña</p>
                  <p className="text-xs text-muted-foreground">
                    Te enviaremos un correo con un enlace para establecer una nueva contraseña.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="email-recuperar">Correo electrónico</Label>
                    <Input
                      id="email-recuperar"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                    {errores["emailRecuperar"] && (
                      <p className="text-xs text-destructive">{errores["emailRecuperar"]}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={cargando}>
                      {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar enlace
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMostrarRecuperar(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="registro" className="mt-6">
              <h1 className="font-display text-2xl font-bold">Darse de alta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Rellena los datos de tu empresa, elige tu tarifa y recibirás el usuario y la
                contraseña en tu correo.
              </p>

              <ol className="mb-8 mt-6 flex items-center gap-3 text-sm">
                {PASOS.map((etiqueta, i) => (
                  <li key={etiqueta} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center border text-xs font-semibold ${
                        i <= pasoAlta
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={i <= pasoAlta ? "font-medium" : "text-muted-foreground"}>
                      {etiqueta}
                    </span>
                    {i < PASOS.length - 1 && <span className="h-px w-8 bg-border" />}
                  </li>
                ))}
              </ol>

              {pasoAlta === 0 && (
                <div className="space-y-4 border border-border p-6">
                  <h2 className="font-display text-lg font-semibold">Datos de la empresa</h2>
                  <form onSubmit={enviarDatos} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        defaultValue={datos?.email}
                      />
                      <p className="text-xs text-muted-foreground">
                        Aquí enviaremos el usuario y la contraseña de acceso.
                      </p>
                      {errores["email"] && (
                        <p className="text-xs text-destructive">{errores["email"]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contacto">Persona de contacto</Label>
                      <Input
                        id="contacto"
                        name="contacto"
                        required
                        defaultValue={datos?.contacto}
                      />
                      {errores["contacto"] && (
                        <p className="text-xs text-destructive">{errores["contacto"]}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa">Nombre de la empresa</Label>
                      <Input id="empresa" name="empresa" required defaultValue={datos?.empresa} />
                      {errores["empresa"] && (
                        <p className="text-xs text-destructive">{errores["empresa"]}</p>
                      )}
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
              )}

              {pasoAlta === 1 && (
                <section>
                  <h2 className="font-display text-xl font-bold">Elige tu tarifa</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sin permanencia. Puedes cambiar de plan cuando quieras desde la configuración.
                  </p>
                  <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {PLANES.map((plan) => (
                      <div
                        key={plan.id}
                        className={`flex flex-col border p-5 ${
                          plan.destacado ? "border-primary shadow-sm" : "border-border"
                        }`}
                      >
                        {plan.destacado && (
                          <span className="mb-3 w-fit bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                            Más elegido
                          </span>
                        )}
                        <h3 className="font-display text-lg font-bold">{plan.nombre}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.descripcion}</p>
                        <p className="mt-3">
                          <span className="font-display text-2xl font-bold">{plan.precio}</span>{" "}
                          <span className="text-sm text-muted-foreground">{plan.periodo}</span>
                        </p>
                        <ul className="mt-4 flex-1 space-y-2 text-sm">
                          {plan.incluye.map((i) => (
                            <li key={i} className="flex gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                              <span className="text-muted-foreground">{i}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="mt-4"
                          variant={plan.destacado ? "default" : "outline"}
                          disabled={cargando}
                          onClick={() => contratar(plan.id, plan.nombre)}
                        >
                          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Contratar {plan.nombre}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-6"
                    onClick={() => setPasoAlta(0)}
                    disabled={cargando}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis datos
                  </Button>
                </section>
              )}

              {pasoAlta === 2 && resultado && (
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
                  <Button
                    className="mt-6 w-full"
                    onClick={() => {
                      setPasoAlta(0);
                      setResultado(null);
                      setDatos(null);
                      navigate({ to: "/auth", search: { tab: "acceder" }, replace: true });
                    }}
                  >
                    Ir a iniciar sesión
                  </Button>
                </section>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

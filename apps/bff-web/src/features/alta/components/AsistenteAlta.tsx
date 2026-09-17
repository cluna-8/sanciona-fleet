import { useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCrearAlta, esquemaDatos, type DatosAlta, type ResultadoAlta } from "@/features/alta";
import { PasoDatosEmpresa } from "@/features/alta/components/PasoDatosEmpresa";
import { PasoTarifa } from "@/features/alta/components/PasoTarifa";
import { PasoResultado } from "@/features/alta/components/PasoResultado";

const PASOS = ["Tus datos", "Tarifa", "Acceso"];

/**
 * Asistente de alta en autoservicio (3 pasos). Antes era el
 * `TabsContent value="registro"` inline en routes/index.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.7. Posee el estado del wizard y
 * recibe la ref `registrando` de la página para que el alta no dispare el
 * redirect de sesión. SPEC §3.10 pendiente (no corregir hallazgos 1–5).
 */
export function AsistenteAlta({ registrando }: { registrando: RefObject<boolean> }) {
  const navigate = useNavigate();
  const alta = useCrearAlta();

  const [pasoAlta, setPasoAlta] = useState(0);
  const [datos, setDatos] = useState<DatosAlta | null>(null);
  const [resultado, setResultado] = useState<ResultadoAlta | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

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
    <>
      <h1 className="font-display text-2xl font-bold">Darse de alta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Rellena los datos de tu empresa, elige tu tarifa y recibirás el usuario y la contraseña en
        tu correo.
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
        <PasoDatosEmpresa datos={datos} errores={errores} onEnviar={enviarDatos} />
      )}

      {pasoAlta === 1 && (
        <PasoTarifa cargando={cargando} onContratar={contratar} onVolver={() => setPasoAlta(0)} />
      )}

      {pasoAlta === 2 && resultado && (
        <PasoResultado resultado={resultado} onIrLogin={() => navigate({ to: "/" })} />
      )}
    </>
  );
}

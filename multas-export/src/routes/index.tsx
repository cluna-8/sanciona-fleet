import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  FileWarning,
  CalendarClock,
  Truck,
  Users,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import camionCarretera from "@/assets/camion-carretera.jpg.asset.json";
import carreteraFlota from "@/assets/carretera-flota.jpg.asset.json";

const IMAGEN_PORTADA = `https://sanciona.lovable.app${camionCarretera.url}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanciona Fleet · Gestión de multas para flotas de transporte" },
      {
        name: "description",
        content:
          "Centraliza las sanciones de tu flota: expedientes, plazos, vehículos, conductores y documentación en una sola plataforma segura.",
      },
      { property: "og:title", content: "Sanciona Fleet · Gestión de multas para flotas" },
      {
        property: "og:description",
        content:
          "Software B2B para empresas españolas de transporte de mercancías por carretera con flotas de 10 a 100 vehículos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: IMAGEN_PORTADA },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: IMAGEN_PORTADA },
    ],
  }),
  component: Inicio,
});

const CARACTERISTICAS = [
  {
    icon: FileWarning,
    titulo: "Expedientes centralizados",
    texto:
      "Registra cada sanción con organismo, categoría, importes, puntos y documentación asociada.",
  },
  {
    icon: CalendarClock,
    titulo: "Control de plazos",
    texto:
      "Avisos por colores para plazos vencidos, críticos a 48 horas y próximos vencimientos a 7 días.",
  },
  {
    icon: Truck,
    titulo: "Vehículos y conductores",
    texto: "Vincula cada expediente a la matrícula y al conductor responsable de la infracción.",
  },
  {
    icon: Users,
    titulo: "Roles de trabajo",
    texto:
      "Administrador de empresa, gestor de sanciones y revisor jurídico con permisos diferenciados.",
  },
  {
    icon: Lock,
    titulo: "Datos aislados por empresa",
    texto: "Cada empresa accede únicamente a su información. Documentos en almacenamiento privado.",
  },
  {
    icon: ShieldCheck,
    titulo: "Trazabilidad completa",
    texto: "Historial de actuaciones, comentarios internos y registro de actividad por expediente.",
  },
];

const CIFRAS = [
  { valor: "20 días", texto: "Plazo habitual de pago con reducción del 50 %" },
  { valor: "10-100", texto: "Vehículos por flota gestionada en la plataforma" },
  { valor: "100 %", texto: "Expedientes con historial y documentación trazable" },
];

function Inicio() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center bg-navy">
              <ShieldCheck className="h-4.5 w-4.5 text-accent" />
            </span>
            <span className="font-display text-lg font-bold uppercase tracking-[0.14em]">
              Sanciona Fleet
            </span>
          </div>
          <Button asChild className="uppercase tracking-[0.1em]">
            <Link to="/auth">Acceder</Link>
          </Button>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-navy text-navy-foreground">
        <img
          src={camionCarretera.url}
          alt="Camión de mercancías circulando por una carretera nacional"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--navy) 8%, color-mix(in oklab, var(--navy) 72%, transparent) 58%, color-mix(in oklab, var(--navy) 30%, transparent) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="max-w-3xl border-l-2 border-accent pl-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              Software para empresas de transporte
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Gestiona las sanciones de tu flota sin perder un solo plazo
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-foreground/80">
              Sanciona Fleet centraliza multas y expedientes sancionadores de empresas españolas de
              transporte de mercancías por carretera con flotas de 10 a 100 vehículos.
            </p>
            <div className="mt-9 flex flex-wrap gap-0.5">
              <Button
                asChild
                size="lg"
                className="bg-accent uppercase tracking-[0.1em] text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/auth">
                  Empezar ahora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {CIFRAS.map((c) => (
            <div key={c.valor} className="px-6 py-8">
              <p className="font-display text-3xl font-extrabold tracking-tight text-navy">
                {c.valor}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Plataforma</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold uppercase tracking-tight">
          Todo el expediente, en un único lugar
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {CARACTERISTICAS.map((c) => (
            <div key={c.titulo} className="bg-card p-7">
              <c.icon className="h-6 w-6 text-accent" strokeWidth={1.75} />
              <h3 className="mt-4 font-display text-base font-bold uppercase tracking-[0.06em]">
                {c.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-navy text-navy-foreground">
        <img
          src={carreteraFlota.url}
          alt="Camión de mercancías circulando por una carretera de montaña"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-navy/82" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl border-l-2 border-accent pl-6">
            <h2 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              Cada plazo bajo control, cada expediente documentado
            </h2>
            <p className="mt-5 text-base leading-relaxed text-navy-foreground/80">
              Registra la notificación, calcula los plazos aplicables, decide la actuación y
              conserva la trazabilidad completa del procedimiento sancionador.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="shrink-0 bg-accent uppercase tracking-[0.1em] text-accent-foreground hover:bg-accent/90"
          >
            <Link to="/auth">
              Crear cuenta <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
          Sanciona Fleet · Prototipo funcional. La información mostrada no constituye asesoramiento
          jurídico.
        </div>
      </footer>
    </div>
  );
}

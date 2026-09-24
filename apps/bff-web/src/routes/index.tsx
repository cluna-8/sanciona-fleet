import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileWarning, AlarmClock, Truck, Users, Lock, History } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanciona Fleet · Gestión de multas para flotas de transporte" },
      {
        name: "description",
        content:
          "Sanciona Fleet centraliza multas y expedientes sancionadores de empresas españolas de transporte de mercancías por carretera con flotas de 10 a 100 vehículos.",
      },
      {
        property: "og:title",
        content: "Sanciona Fleet · Gestión de multas para flotas de transporte",
      },
      {
        property: "og:description",
        content:
          "Cada notificación queda registrada con su organismo, su importe, sus plazos y el vehículo o conductor implicado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaInicio,
});

const RECORRIDO = [
  {
    icono: FileWarning,
    titulo: "Funcionalidades",
    descripcion:
      "Qué incluye la plataforma: expedientes, plazos, vehículos, conductores, roles de trabajo y trazabilidad.",
    to: "/funcionalidades" as const,
  },
  {
    icono: AlarmClock,
    titulo: "Tarifas",
    descripcion:
      "Los planes mensuales según el tamaño de la flota, con lo que incluye cada uno y cómo darse de alta.",
    to: "/tarifas" as const,
  },
  {
    icono: Truck,
    titulo: "Plataforma",
    descripcion:
      "Las pantallas de trabajo reales: resumen, sanciones, calendario, documentos e informes.",
    to: "/plataforma" as const,
  },
];

const DESTACADOS = [
  { icono: Truck, texto: "Expedientes vinculados a vehículos y conductores" },
  { icono: AlarmClock, texto: "Avisos de plazos de pago y de recurso" },
  { icono: Lock, texto: "Documentación almacenada de forma privada" },
  { icono: History, texto: "Trazabilidad completa de cada actuación" },
];

function PaginaInicio() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-border bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Software para empresas de transporte
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold uppercase leading-tight sm:text-5xl">
            Gestiona las sanciones de tu flota sin perder un solo plazo
          </h1>
          <p className="mt-6 max-w-2xl text-navy-foreground/75">
            Sanciona Fleet centraliza multas y expedientes sancionadores de empresas españolas de
            transporte de mercancías por carretera con flotas de 10 a 100 vehículos. Cada
            notificación queda registrada con su organismo, su importe, sus plazos y el vehículo o
            conductor implicado, de forma que el equipo de administración deja de depender de
            carpetas de correo y hojas de cálculo repartidas entre varias personas.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-navy-foreground/60">
            La información está separada por empresa, los documentos se guardan en almacenamiento
            privado y cada actuación queda registrada en el historial del expediente.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/auth" search={{ tab: "registro" }}>
                Empezar ahora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-navy-foreground/30 bg-transparent text-navy-foreground hover:bg-navy-foreground/10"
              asChild
            >
              <Link to="/funcionalidades">Ver funcionalidades</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Destacados rápidos */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {DESTACADOS.map((d) => (
            <div key={d.texto} className="flex items-start gap-3">
              <d.icono className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm text-muted-foreground">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recorrido del sitio */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Recorrido del sitio
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
          Cada tema, en su propia página
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Esta página de inicio solo presenta el producto. El detalle de lo que hace, del
          procedimiento de trabajo y de las pantallas está separado en tres páginas independientes,
          para que puedas leer únicamente lo que te interesa.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {RECORRIDO.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col border border-border p-6 transition-colors hover:border-navy"
            >
              <item.icono className="h-6 w-6 text-navy" />
              <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-tight">
                {item.titulo}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.descripcion}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-navy">
                Entrar{" "}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              ¿Listo para dejar de perseguir plazos en hojas de cálculo?
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> Crea tu cuenta y da de alta tu primera flota en minutos.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/auth" search={{ tab: "registro" }}>
              Crear cuenta <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  AlarmClock,
  Truck,
  Users,
  Lock,
  History,
  ClipboardList,
  BellRing,
  FolderClosed,
  ShieldAlert,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/funcionalidades")({
  head: () => ({
    meta: [
      { title: "Funcionalidades y cómo funciona · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Qué incluye Sanciona Fleet y el procedimiento completo de una sanción, desde que llega la notificación hasta que se archiva el expediente.",
      },
    ],
  }),
  component: PaginaFuncionalidades,
});

const FUNCIONALIDADES = [
  {
    n: "01",
    icono: FileText,
    titulo: "Expedientes centralizados",
    texto:
      "Cada sanción se registra como un expediente con el organismo que la emite, la categoría de la infracción, los importes, la posible retirada de puntos y los documentos asociados. Todo el equipo consulta la misma ficha, sin versiones paralelas.",
  },
  {
    n: "02",
    icono: AlarmClock,
    titulo: "Control de plazos",
    texto:
      "Los vencimientos se señalan por colores: plazos ya vencidos, plazos críticos dentro de las próximas 48 horas y plazos próximos dentro de los siguientes 7 días. Así se ve de un vistazo qué expediente exige atención hoy.",
  },
  {
    n: "03",
    icono: Truck,
    titulo: "Vehículos y conductores",
    texto:
      "Cada expediente se vincula a la matrícula del vehículo y al conductor responsable de la infracción. Desde la ficha de un vehículo o de un conductor se consulta su historial completo de sanciones.",
  },
  {
    n: "04",
    icono: Users,
    titulo: "Roles de trabajo",
    texto:
      "Tres perfiles con permisos diferenciados: administrador de empresa, gestor de sanciones y revisor jurídico. Cada persona ve y edita lo que corresponde a su función.",
  },
  {
    n: "05",
    icono: Lock,
    titulo: "Datos aislados por empresa",
    texto:
      "Cada empresa accede únicamente a su propia información y los documentos se guardan en almacenamiento privado, no en enlaces públicos.",
  },
  {
    n: "06",
    icono: History,
    titulo: "Trazabilidad completa",
    texto:
      "Historial de actuaciones, comentarios internos y registro de actividad por expediente, para poder justificar después qué se hizo, cuándo y quién lo hizo.",
  },
];

const MODULOS = [
  {
    icono: ClipboardList,
    titulo: "Resumen",
    texto: "Visión global del estado de las sanciones y de los plazos abiertos de toda la flota.",
  },
  {
    icono: BellRing,
    titulo: "Avisos",
    texto: "Listado de vencimientos críticos para revisar antes de que expire cualquier plazo.",
  },
  {
    icono: FolderClosed,
    titulo: "Documentos",
    texto: "Resoluciones, notificaciones y justificantes archivados junto a su expediente.",
  },
  {
    icono: ShieldAlert,
    titulo: "Prevención",
    texto:
      "Análisis de las infracciones que se repiten, para actuar sobre las causas y no solo sobre la multa.",
  },
];

const PROCEDIMIENTO = [
  {
    n: "01",
    titulo: "Registra la notificación",
    texto:
      "Cuando llega una notificación, se da de alta el expediente con el organismo que la emite, el importe, la categoría de la infracción y el vehículo afectado. Si se conoce, se indica también el conductor responsable, de modo que la sanción queda asociada a su historial.",
  },
  {
    n: "02",
    titulo: "Calcula los plazos aplicables",
    texto:
      "A partir de las fechas de la notificación, la plataforma sitúa en el calendario los vencimientos del expediente: pago, recurso y recargo. Los plazos vencidos, los críticos a 48 horas y los próximos a 7 días se distinguen por color en el resumen y en los avisos.",
  },
  {
    n: "03",
    titulo: "Decide la actuación",
    texto:
      "El gestor de sanciones decide qué hacer con el expediente y el revisor jurídico puede intervenir cuando la vía es un recurso. Los comentarios internos quedan en la propia ficha, sin cadenas de correo paralelas.",
  },
  {
    n: "04",
    titulo: "Documenta y archiva",
    texto:
      "Se adjuntan resoluciones y justificantes al expediente, que quedan guardados en almacenamiento privado. El historial de actuaciones permite reconstruir después qué se hizo, cuándo y quién lo hizo.",
  },
];

const PERFILES = [
  {
    rol: "Administrador de empresa",
    texto: "Gestiona los datos de la empresa, los usuarios del equipo y sus permisos.",
  },
  {
    rol: "Gestor de sanciones",
    texto: "Da de alta los expedientes, vigila los plazos y mantiene la documentación al día.",
  },
  {
    rol: "Revisor jurídico",
    texto: "Revisa los expedientes en los que se plantea recurso antes de que venza el plazo.",
  },
];

function PaginaFuncionalidades() {
  return (
    <MarketingLayout>
      <section className="border-b border-border bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Funcionalidades y cómo funciona
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">
            Qué incluye la plataforma y cómo se trabaja con ella
          </h1>
          <p className="mt-5 max-w-2xl text-navy-foreground/75">
            Sanciona Fleet está pensado para equipos de administración de flotas que gestionan
            sanciones de forma continua. En esta página encontrarás tanto las funciones disponibles
            como el procedimiento completo de una sanción, desde que llega la notificación hasta que
            se archiva el expediente.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONALIDADES.map((f) => (
            <div key={f.n}>
              <span className="text-xs font-semibold text-accent">{f.n}</span>
              <div className="mt-2 flex items-center gap-2">
                <f.icono className="h-5 w-5 text-navy" />
                <h3 className="font-display text-base font-bold uppercase tracking-tight">
                  {f.titulo}
                </h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-bold">Módulos incluidos</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Además del expediente, la plataforma agrupa el trabajo diario en cuatro módulos
            complementarios.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {MODULOS.map((m) => (
              <div key={m.titulo} className="border border-border bg-background p-5">
                <m.icono className="h-5 w-5 text-accent" />
                <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-tight">
                  {m.titulo}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{m.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Cómo funciona</p>
        <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
          Del aviso del organismo al expediente cerrado
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          El procedimiento es siempre el mismo para cualquier sanción, la gestione quien la
          gestione. Esa repetición es justamente lo que evita que un plazo se pierda por un cambio
          de turno, unas vacaciones o un correo que nadie abrió.
        </p>

        <ol className="mt-10 grid gap-8 md:grid-cols-2">
          {PROCEDIMIENTO.map((p) => (
            <li key={p.n} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-navy text-sm font-bold text-navy">
                {p.n}
              </span>
              <div>
                <h3 className="font-display text-base font-bold uppercase tracking-tight">
                  {p.titulo}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Quién interviene
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            Cada perfil, con su parte del procedimiento
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PERFILES.map((p) => (
              <div key={p.rol} className="border border-border bg-background p-5">
                <h3 className="font-display text-sm font-bold uppercase tracking-tight text-navy">
                  {p.rol}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-16 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">
          ¿Quieres saber cuánto cuesta para el tamaño de tu flota?
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/tarifas">
              Ver tarifas <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/plataforma">Ver la plataforma</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

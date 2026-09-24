import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  LayoutDashboard,
  FileWarning,
  CalendarDays,
  FolderClosed,
  BarChart3,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/plataforma")({
  head: () => ({
    meta: [
      { title: "La plataforma · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Las pantallas de trabajo reales de Sanciona Fleet: resumen, sanciones, calendario, documentos e informes.",
      },
    ],
  }),
  component: PaginaPlataforma,
});

const PANTALLAS = [
  {
    n: "01",
    icono: LayoutDashboard,
    titulo: "Resumen",
    texto:
      "La pantalla de entrada reúne el estado general de la flota: expedientes abiertos, plazos por vencer y lo que exige atención inmediata. Es el punto desde el que se decide por dónde empezar el día.",
  },
  {
    n: "02",
    icono: FileWarning,
    titulo: "Sanciones",
    texto:
      "El listado completo de expedientes, con su organismo, importe, vehículo y estado. Desde aquí se abre cada ficha para consultar el detalle, los comentarios internos y el historial de actuaciones.",
  },
  {
    n: "03",
    icono: CalendarDays,
    titulo: "Calendario",
    texto:
      "Los vencimientos de pago, recurso y recargo situados en el tiempo, para ver de una sola vez la carga de trabajo de la semana y anticipar los plazos críticos.",
  },
  {
    n: "04",
    icono: FolderClosed,
    titulo: "Documentos",
    texto:
      "Notificaciones, resoluciones y justificantes archivados junto al expediente al que pertenecen, guardados en almacenamiento privado de la empresa.",
  },
  {
    n: "05",
    icono: BarChart3,
    titulo: "Informes",
    texto:
      "Una lectura agregada de lo ocurrido, útil para revisar la evolución de las sanciones de la flota y detectar dónde se concentran.",
  },
];

function PaginaPlataforma() {
  return (
    <MarketingLayout>
      <section className="border-b border-border bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Plataforma</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">
            Interfaz clara, datos ordenados
          </h1>
          <p className="mt-5 max-w-2xl text-navy-foreground/75">
            Todas las pantallas siguen el mismo criterio visual: tipografía recta, sin adornos, y la
            información importante siempre en el mismo sitio. Quien aprende a usar una pantalla sabe
            leer las demás.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="space-y-10">
          {PANTALLAS.map((p) => (
            <div key={p.n} className="flex gap-5 border-b border-border pb-10 last:border-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-navy">
                <p.icono className="h-5 w-5 text-accent" />
              </div>
              <div>
                <span className="text-xs font-semibold text-accent">{p.n}</span>
                <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-tight">
                  {p.titulo}
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="font-display text-xl font-bold sm:text-2xl">
            Cada plazo bajo control, cada expediente documentado
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Registra la notificación, calcula los plazos aplicables, decide la actuación y conserva
            la trazabilidad completa del procedimiento.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/auth" search={{ tab: "registro" }}>
              Crear cuenta <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

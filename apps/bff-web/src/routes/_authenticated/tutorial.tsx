import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import imgDashboard from "@/assets/tutorial/dashboard.jpg";
import imgSanciones from "@/assets/tutorial/sanciones.jpg";
import imgNueva from "@/assets/tutorial/nueva.jpg";
import imgCalendario from "@/assets/tutorial/calendario.jpg";
import imgDocumentos from "@/assets/tutorial/documentos.jpg";
import imgInformes from "@/assets/tutorial/informes.jpg";

export const Route = createFileRoute("/_authenticated/tutorial")({
  head: () => ({
    meta: [
      { title: "Tutorial de uso · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Guía paso a paso para empezar a usar Sanciona Fleet: alta de sanciones, plazos, documentos e informes.",
      },
      { property: "og:title", content: "Tutorial de uso · Sanciona Fleet" },
      {
        property: "og:description",
        content: "Aprende en pocos pasos a gestionar las sanciones de tu flota.",
      },
    ],
  }),
  component: PaginaTutorial,
});

const SECCIONES = [
  {
    titulo: "Panel de control",
    resumen: "Toda la situación de tus expedientes en una sola pantalla.",
    imagen: imgDashboard,
    puntos: [
      "Indicadores de sanciones abiertas, pendientes de revisión y plazos que vencen en 7 días.",
      "Importe abierto y ahorro potencial por pronto pago.",
      "Distribución por estado y por categoría, más los últimos expedientes registrados.",
    ],
  },
  {
    titulo: "Alta de una sanción",
    resumen: "Sube el documento y la plataforma extrae los datos por ti.",
    imagen: imgNueva,
    puntos: [
      "Arrastra el PDF o la foto de la notificación: se lee automáticamente el expediente, importes y fechas.",
      "Revisa las advertencias (CIF, matrícula, tipificación) antes de confirmar el alta.",
      "Si lo prefieres, puedes completar los datos manualmente.",
    ],
  },
  {
    titulo: "Expedientes de sanciones",
    resumen: "Busca, filtra y trabaja cada expediente hasta su resolución.",
    imagen: imgSanciones,
    puntos: [
      "Filtros por estado, prioridad, vehículo, conductor y fechas.",
      "Ficha con análisis asistido: semáforo, factores, incidencias a comprobar y referencias legales.",
      "Generación de borradores de alegaciones y registro de actuaciones.",
    ],
  },
  {
    titulo: "Calendario de plazos",
    resumen: "Nunca pierdas una fecha de pago o de recurso.",
    imagen: imgCalendario,
    puntos: [
      "Plazos de pago con reducción, alegaciones, recurso e identificación del conductor.",
      "Aviso cuando el plazo está pendiente de determinar por falta de fecha de notificación.",
      "Vista mensual y listado de próximos vencimientos.",
    ],
  },
  {
    titulo: "Documentos",
    resumen: "Archivo privado y trazable de toda la documentación.",
    imagen: imgDocumentos,
    puntos: [
      "Almacenamiento privado por empresa, con acceso restringido por rol.",
      "Cada documento queda vinculado a su expediente.",
      "Registro de accesos y descargas.",
    ],
  },
  {
    titulo: "Informes y prevención",
    resumen: "Mide resultados y anticípate a las reincidencias.",
    imagen: imgInformes,
    puntos: [
      "Importes pagados, evitados y descuentos aplicados.",
      "Resultados por categoría de infracción y por conductor o vehículo.",
      "Recomendaciones de prevención basadas en tu histórico.",
    ],
  },
];

function PaginaTutorial() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const seccion = SECCIONES[paso]!;
  const ultimo = paso === SECCIONES.length - 1;

  function salir() {
    try {
      localStorage.setItem("sanciona-tutorial-visto", "1");
    } catch {
      /* almacenamiento no disponible */
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <ShieldCheck className="h-6 w-6 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-none text-foreground">
              Cómo usar Sanciona Fleet
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              Paso {paso + 1} de {SECCIONES.length}
            </p>
          </div>
          <Button variant="outline" onClick={salir}>
            Saltar tutorial
          </Button>
        </div>
        <div className="h-1 w-full bg-neutral-soft">
          <div
            className="h-full bg-navy transition-all"
            style={{ width: `${((paso + 1) / SECCIONES.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Sección {paso + 1}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
              {seccion.titulo}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{seccion.resumen}</p>
            <ul className="mt-6 space-y-3">
              {seccion.puntos.map((p) => (
                <li key={p} className="flex gap-3 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPaso((n) => Math.max(0, n - 1))}
                disabled={paso === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              {ultimo ? (
                <Button onClick={salir}>Empezar a usar la plataforma</Button>
              ) : (
                <Button onClick={() => setPaso((n) => Math.min(SECCIONES.length - 1, n + 1))}>
                  Siguiente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {SECCIONES.map((s, i) => (
                <button
                  key={s.titulo}
                  onClick={() => setPaso(i)}
                  aria-label={`Ir a ${s.titulo}`}
                  aria-current={i === paso}
                  className={cn(
                    "h-2 w-10 transition-colors",
                    i === paso ? "bg-navy" : "bg-neutral-soft hover:bg-navy/40",
                  )}
                />
              ))}
            </div>
          </div>

          <figure className="card-surface overflow-hidden">
            <img
              src={seccion.imagen}
              alt={`Captura de la sección ${seccion.titulo} de Sanciona Fleet`}
              className="w-full border-b border-border"
              loading="lazy"
            />
            <figcaption className="px-4 py-3 text-xs text-muted-foreground">
              {seccion.titulo} · imagen real de la plataforma
            </figcaption>
          </figure>
        </div>
      </main>
    </div>
  );
}

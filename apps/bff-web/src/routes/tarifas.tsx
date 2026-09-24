import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Button } from "@/components/ui/button";
import { PLANES } from "@/lib/planes";

export const Route = createFileRoute("/tarifas")({
  head: () => ({
    meta: [
      { title: "Tarifas · Sanciona Fleet" },
      {
        name: "description",
        content:
          "Suscripción mensual sin permanencia. Un plan para cada tamaño de flota, con la plataforma completa de gestión de sanciones.",
      },
    ],
  }),
  component: PaginaTarifas,
});

function PaginaTarifas() {
  return (
    <MarketingLayout>
      <section className="border-b border-border bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Tarifas</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">
            Un plan para cada tamaño de flota
          </h1>
          <p className="mt-5 max-w-2xl text-navy-foreground/75">
            Suscripción mensual sin permanencia. Todos los planes incluyen la plataforma completa de
            gestión de sanciones; cambian el número de vehículos, de usuarios y los módulos
            disponibles.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col border p-6 ${
                plan.destacado ? "border-navy shadow-sm" : "border-border"
              }`}
            >
              {plan.destacado && (
                <span className="mb-3 w-fit bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
                  Más elegido
                </span>
              )}
              <h3 className="font-display text-lg font-bold uppercase tracking-tight">
                {plan.nombre}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.descripcion}</p>
              <p className="mt-4">
                <span className="font-display text-3xl font-bold">{plan.precio}</span>{" "}
                <span className="text-sm text-muted-foreground">{plan.periodo} + IVA</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.incluye.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{i}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6" variant={plan.destacado ? "default" : "outline"} asChild>
                <Link to="/auth" search={{ tab: "registro" }}>
                  Darse de alta
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Cómo se contrata</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Crea tu cuenta, elige el plan que encaja con tu flota y completa el pago de la primera
            mensualidad. La suscripción se renueva cada mes y puedes cambiar de plan o cancelarla en
            cualquier momento.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}

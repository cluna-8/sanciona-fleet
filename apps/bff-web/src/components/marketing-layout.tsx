import { Link } from "@tanstack/react-router";
import { ShieldCheck, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/funcionalidades", label: "Funcionalidades" },
  { to: "/plataforma", label: "Plataforma" },
  { to: "/tarifas", label: "Tarifas" },
] as const;

export function MarketingHeader() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setAbierto(false)}>
          <span className="flex h-8 w-8 items-center justify-center bg-navy">
            <ShieldCheck className="h-4.5 w-4.5 text-accent" />
          </span>
          <span className="font-display text-base font-bold tracking-tight">SANCIONA FLEET</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild>
            <Link to="/auth">Acceder</Link>
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setAbierto((v) => !v)}
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {abierto && (
        <nav className="border-t border-border px-4 py-4 md:hidden">
          <ul className="space-y-3">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="block text-sm font-medium text-foreground"
                  onClick={() => setAbierto(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/auth"
                className="mt-2 block text-sm font-semibold text-navy"
                onClick={() => setAbierto(false)}
              >
                Acceder →
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center bg-navy">
            <ShieldCheck className="h-4 w-4 text-accent" />
          </span>
          <span className="font-display text-sm font-bold tracking-tight">SANCIONA FLEET</span>
        </div>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Software para la gestión centralizada de sanciones de tráfico en flotas de transporte por
          carretera.
        </p>
        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <Link to="/auth" className="hover:text-foreground">
            Acceder
          </Link>
        </nav>
        <p className="mt-8 text-xs text-muted-foreground">© 2026 Sanciona Fleet</p>
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}

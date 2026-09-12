import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileWarning,
  Truck,
  Users,
  CalendarClock,
  UserCog,
  Building2,
  FolderClosed,
  BarChart3,
  BellRing,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cerrarSesion } from "@/features/auth";
import { useSesion, useEmpresaActiva, useEsSuperadmin } from "@/hooks/use-org";

import { etiquetaRol } from "@/lib/fleet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { to: "/sanciones", label: "Sanciones", icon: FileWarning },
  { to: "/calendario", label: "Plazos", icon: CalendarClock },
  { to: "/vehiculos", label: "Vehículos", icon: Truck },
  { to: "/conductores", label: "Conductores", icon: Users },
  { to: "/documentos", label: "Documentos", icon: FolderClosed },
  { to: "/informes", label: "Informes", icon: BarChart3 },
  { to: "/prevencion", label: "Prevención", icon: ShieldAlert },
  { to: "/avisos", label: "Avisos", icon: BellRing },
  { to: "/usuarios", label: "Usuarios", icon: UserCog },
  { to: "/empresa", label: "Configuración", icon: Building2 },
] as const;

export function AppShell({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const { data: sesion } = useSesion();
  const { data: esSuperadmin } = useEsSuperadmin();
  useEmpresaActiva();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const enlaces = esSuperadmin
    ? [...NAV, { to: "/superadmin", label: "Superadministración", icon: ShieldCheck } as const]
    : NAV;

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await cerrarSesion();
    navigate({ to: "/auth", replace: true });
  }

  const iniciales = (sesion?.fullName || sesion?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-surface">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy text-navy-foreground transition-transform lg:translate-x-0",
          abierto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <div>
            <p className="font-display text-base font-bold leading-none">Sanciona Fleet</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-navy-foreground/60">
              Gestión de sanciones
            </p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {enlaces.map((item) => {
            const activo = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setAbierto(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activo
                    ? "bg-white/12 text-navy-foreground"
                    : "text-navy-foreground/70 hover:bg-white/8 hover:text-navy-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {iniciales}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{sesion?.fullName || sesion?.email}</p>
              <p className="truncate text-[11px] text-navy-foreground/60">
                {etiquetaRol(sesion?.role)}
              </p>
            </div>
          </div>
          <button
            onClick={cerrarSesion}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-navy-foreground/70 transition-colors hover:bg-white/8 hover:text-navy-foreground"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-navy/50 lg:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setAbierto(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                {titulo}
              </h1>
              {descripcion && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{descripcion}</p>
              )}
            </div>
            {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
          </div>
          {sesion?.organization && (
            <div className="border-t border-border bg-secondary/60 px-4 py-1.5 text-xs text-muted-foreground sm:px-6">
              Empresa activa:{" "}
              <strong className="text-foreground">{sesion.organization.name}</strong>
              {sesion.organization.cif ? ` · CIF ${sesion.organization.cif}` : ""}
            </div>
          )}
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

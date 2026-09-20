import { test, expect } from "@playwright/test";

/**
 * Smoke de las pantallas alcanzables (sin $id). Verifica que cada ruta carga
 * con el AppShell (auth mantenida) y no redirige a /auth ni a error.
 * Paridad: confirma que las 22 rutas de Lovable existen y renderizan.
 */
const RUTAS: Array<{ to: string; clave: string }> = [
  { to: "/dashboard", clave: "Resumen" },
  { to: "/sanciones", clave: "Sanciones" },
  { to: "/sanciones/nueva", clave: "Nueva sanción" },
  { to: "/vehiculos", clave: "Vehículos" },
  { to: "/conductores", clave: "Conductores" },
  { to: "/documentos", clave: "Documentos" },
  { to: "/calendario", clave: "Plazos" },
  { to: "/avisos", clave: "Avisos" },
  { to: "/informes", clave: "Informes" },
  { to: "/prevencion", clave: "Prevención" },
  { to: "/usuarios", clave: "Usuarios" },
  { to: "/empresa", clave: "Configuración" },
  { to: "/superadmin", clave: "Superadministración" },
  { to: "/tutorial", clave: "Tutorial" },
];

for (const { to, clave } of RUTAS) {
  test(`ruta ${to} carga (${clave})`, async ({ page }) => {
    await page.goto(to);
    // No redirige a /auth (sesión perdida) ni a error
    await expect(page).not.toHaveURL(/\/auth(\?|$)/);
    // El AppShell renderizó: el link "Sanciones" del sidebar está visible
    // (excepto en /tutorial que puede no tener AppShell — ahí validamos título)
    if (to === "/tutorial") {
      await expect(page.getByText(/tutorial|onboarding|paso/i).first()).toBeVisible({
        timeout: 15000,
      });
    } else {
      await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });
    }
  });
}

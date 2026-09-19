import { test, expect } from "@playwright/test";

/**
 * Superadmin — Cristian es platform_admin. /superadmin debe renderizar la visión
 * global (totales + resumen por empresa) gated por el RPC is_platform_admin.
 */
test("/superadmin muestra la visión global de plataforma", async ({ page }) => {
  await page.goto("/superadmin");
  // El link "Superadministración" del sidebar confirma que esSuperadmin = true
  await expect(page.getByRole("link", { name: "Superadministración" })).toBeVisible({ timeout: 15000 });

  // La página renderiza agregados globales. Buscamos algún texto típico.
  await expect(
    page.getByText(/empresas|usuarios|sanciones|flota|importe total|visión global|totales/i).first(),
  ).toBeVisible({ timeout: 15000 });
});
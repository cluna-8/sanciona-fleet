import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const AUTH_FILE = "e2e/.auth/user.json";

/**
 * Hace login UI con la cuenta de prueba y guarda la sesión (storageState)
 * para que el resto de specs la reutilicen sin volver a loguearse.
 */
setup("login como cristian@sanciona-fleet.com", async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? "cristian@sanciona-fleet.com";
  // Password sólo desde env (E2E_PASSWORD), inyectado por scripts/run-e2e.sh.
  // Sin env, fallar explícitamente — nunca hardcodear credenciales en el repo.
  const password = process.env.E2E_PASSWORD;
  if (!password) {
    throw new Error(
      "E2E_PASSWORD no definido en el entorno. Usa scripts/run-e2e.sh o exporta E2E_PASSWORD manualmente.",
    );
  }

  await page.goto("/");
  // La pestaña "Iniciar sesión" es la default, pero la aseguramos.
  await page.getByRole("tab", { name: "Iniciar sesión" }).click();

  await page.getByLabel("Usuario o correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  // Tras login exitoso redirige a /dashboard
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard/);

  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});

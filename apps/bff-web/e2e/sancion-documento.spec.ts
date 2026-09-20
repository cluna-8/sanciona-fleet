import { test, expect } from "@playwright/test";
import { borrarSancion } from "./lib/helpers";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CU-01 — Alta de expediente desde documento (flujo insignia).
 *
 * Sube un PDF de sanción de ejemplo -> procesarDocumento (OpenRouter real,
 * modelo gemini-2.5-flash) -> revisión de campos extraídos -> crear expediente.
 * Assertions estructurales (la IA es no determinista): se llega a la revisión,
 * aparece el botón de crear, y al crear se redirige al detalle del expediente.
 *
 * Si la IA falla en prod, este spec falla con timeout -> hallazgo real.
 */
let sanctionId: string | null = null;

test.afterAll(async () => {
  if (sanctionId) await borrarSancion(sanctionId);
});

test("CU-01: subir PDF, extraer con IA y crear expediente", async ({ page }) => {
  test.setTimeout(120_000); // la extracción IA puede tardar
  await page.goto("/sanciones/nueva");
  await expect(page.getByText("Alta manual del expediente")).toBeVisible({ timeout: 15000 });

  // Esperar a que la sesión (orgId + userId) esté cargada antes de subir:
  // el banner "Empresa activa:" sólo renderiza cuando sesion.organization
  // está disponible (app-shell.tsx). Si clicamos antes, el mutate hace throw
  // "Tu usuario no tiene una empresa activa asignada" sin llegar a Storage.
  await expect(page.getByText("Empresa activa:")).toBeVisible({ timeout: 15000 });

  const pdf = resolve(__dirname, "fixtures/sancion-ejemplo.pdf");
  await page.locator('input[type="file"]').setInputFiles(pdf);

  // El archivo queda seleccionado y el botón de procesar se habilita
  await expect(page.getByRole("button", { name: "Procesar documento" })).toBeEnabled({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Procesar documento" }).click();

  // Esperar a que la extracción termine y aparezca la revisión (paso 2).
  // Marcador robusto: el botón "Crear expediente con esta información".
  const btnCrear = page.getByRole("button", { name: "Crear expediente con esta información" });
  await expect(btnCrear).toBeVisible({ timeout: 90_000 });

  // Si hay discrepancia de CIF bloqueante, hay que confirmarla primero.
  const continuar = page.getByRole("button", { name: "Continuar de todos modos" });
  if (await continuar.isVisible().catch(() => false)) {
    await continuar.click();
  }

  await btnCrear.click();

  // Tras crear, redirige al detalle /sanciones/{uuid}
  await page.waitForURL(/\/sanciones\/[0-9a-f-]{36}/, { timeout: 30_000 });
  const match = page.url().match(/\/sanciones\/([0-9a-f-]{36})/);
  sanctionId = match?.[1] ?? null;
  expect(sanctionId).toBeTruthy();

  // El detalle renderiza (cabecera del expediente / historial)
  await expect(
    page.getByText(/historial de actuaciones|actuaciones|expediente/i).first(),
  ).toBeVisible({ timeout: 15000 });
});

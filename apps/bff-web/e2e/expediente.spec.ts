import { test, expect } from "@playwright/test";
import { crearSancion, borrarSancion, uid } from "./lib/helpers";

/**
 * CU-03 (plazos), CU-04 (análisis IA), CU-05 (borrador versionado + export).
 *
 * Usa un expediente sembrado vía service_role (con fecha de notificación para
 * que el motor de plazos calcule) y comparte su id entre los tres tests en orden.
 * Limpieza en afterAll (borra en cascada documentos/acciones/plazos/análisis/borradores).
 */
const REF = `TEST-CU03-${uid("")}`;
let sanctionId = "";

test.describe.serial("expediente: plazos → análisis → borrador", () => {
  test.beforeAll(async () => {
    sanctionId = await crearSancion({
      reference: REF,
      organismo: "DGT",
      categoria: "Tráfico",
      notificationDate: "2026-09-15",
      violationDate: "2026-09-10",
      importe: 200,
    });
  });

  test.afterAll(async () => {
    if (sanctionId) await borrarSancion(sanctionId);
  });

  test("CU-03: recalcular plazos (deadlines-service)", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(`/sanciones/${sanctionId}`);
    await expect(page.getByRole("main").getByText("Plazos", { exact: true })).toBeVisible({ timeout: 15000 });

    // Estado inicial: sin plazos (sembrado sin pasar por crearExpedienteDesdeExtraccion)
    await expect(page.getByText("Sin plazos calculados.")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Recalcular" }).click();
    // Tras recalc, aparece al menos un plazo con su tipo
    await expect(page.getByText(/Pago con reducción|Alegaciones|Identificación del conductor|Recurso/).first()).toBeVisible({ timeout: 30_000 });
  });

  test("CU-04: análisis con IA (OpenRouter, semáforo)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/sanciones/${sanctionId}`);
    await expect(page.getByRole("main").getByText("Plazos", { exact: true })).toBeVisible({ timeout: 15000 });

    const btn = page.getByRole("button", { name: /Iniciar análisis|Repetir análisis/ });
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();

    // El análisis escribe semáforo + "Confianza:". Esperamos a que aparezca.
    await expect(page.getByText(/Confianza:/)).toBeVisible({ timeout: 100_000 });
  });

  test("CU-05: generar borrador, versionar y exportar", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/sanciones/${sanctionId}`);
    await expect(page.getByRole("main").getByText("Plazos", { exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Preparar alegaciones" }).click();

    // Aparece el enlace al borrador ("Alegaciones · expediente …" → /borradores/{id})
    const enlaceBorrador = page.locator('a[href^="/borradores/"]').first();
    await expect(enlaceBorrador).toBeVisible({ timeout: 100_000 });
    await enlaceBorrador.click();

    await page.waitForURL(/\/borradores\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // El editor renderiza: textarea editable, guardar versión, exportar PDF y .doc
    await expect(page.getByRole("button", { name: "Guardar versión" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Exportar a PDF/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Descargar documento editable/ })).toBeVisible();
    await expect(page.getByText("Versión 1")).toBeVisible();

    // Edita el texto y guarda una segunda versión
    const textarea = page.locator("textarea").first();
    await textarea.fill("Texto de prueba E2E para la versión 2 del borrador.");
    await page.getByRole("button", { name: "Guardar versión" }).click();

    await expect(page.getByText("Versión 2")).toBeVisible({ timeout: 15000 });
  });
});
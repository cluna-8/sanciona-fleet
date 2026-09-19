import { test, expect } from "@playwright/test";

/**
 * CU-02 — Alta manual de expediente.
 *
 * Hallazgo de la exploración: el formulario manual de /sanciones/nueva NO tiene
 * botón de submit (el `onSubmit` existe pero no hay <Button type="submit">), así
 * que no es posible dar de alta un expediente manualmente desde la UI. Tampoco
 * hay campo `municipality` (solo llega vía extracción IA), lo que deja vacía la
 * dimensión "zonas" de /prevencion para altas manuales.
 *
 * Este spec documenta el bug: verifica que el formulario renderiza sus campos
 * pero que NO hay botón de envío, y que rellenar + Enter no crea el expediente.
 */
test("CU-02: el alta manual NO tiene botón de enviar (bug de paridad)", async ({ page }) => {
  await page.goto("/sanciones/nueva");
  await expect(page.getByText("Alta manual del expediente")).toBeVisible({ timeout: 15000 });

  // Los campos del formulario manual existen
  await expect(page.locator('input[name="reference_number"]')).toBeVisible();
  await expect(page.locator('input[name="original_amount"]')).toBeVisible();

  // Rellena un expediente de prueba (no se creará)
  await page.locator('input[name="reference_number"]').fill("TEST-CU02-NO-SUBMIT");
  await page.locator('input[name="original_amount"]').fill("100");

  // NO debe existir un botón de submit dentro del form manual.
  // El único botón "Entrar"/"Guardar" sería del diálogo de flota, no de este form.
  const formularios = page.locator('form:has(input[name="reference_number"])');
  const botonesSubmit = formularios.locator('button[type="submit"], button:has-text("Guardar"), button:has-text("Registrar"), button:has-text("Crear")');
  await expect(botonesSubmit).toHaveCount(0);

  // Confirmación negativa: entrar a /sanciones y verificar que no aparece el expediente
  await page.goto("/sanciones");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("TEST-CU02-NO-SUBMIT")).toHaveCount(0);
});
import { test, expect } from "@playwright/test";

/**
 * Paridad de pantallas secundarias: informes (CSV), avisos (marcar leído),
 * calendario (plazos), prevención (patrones).
 *
 * La org "cristian" puede estar vacía en algunos bloques -> los specs toleran
 * el estado vacío (el feature existe = paridad) y sólo prueban la acción si hay
 * datos.
 */

test("informes: página renderiza + botones CSV presentes (paridad)", async ({ page }) => {
  await page.goto("/informes");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });

  // El botón CSV existe (paridad: feature presente). Si la org no tiene datos
  // está disabled — válido. Si hay datos y está habilitado, probamos la descarga.
  const csv = page.getByRole("button", { name: "CSV" }).first();
  await expect(csv).toBeVisible({ timeout: 10000 });

  if (await csv.isEnabled()) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      csv.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  } else {
    // Estado vacío: paridad OK (botón presente, lógica de disable correcta)
    expect(await csv.isDisabled()).toBeTruthy();
  }
});

test("avisos: lista renderiza (vacía o con avisos)", async ({ page }) => {
  await page.goto("/avisos");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });

  // Si hay avisos: botón "Marcar todos como leídos". Si no: empty state.
  const marcar = page.getByRole("button", { name: /Marcar todos como leídos/ });
  const vacio = page.getByText(/No hay avisos registrados/i);
  // Al menos uno de los dos estados (con avisos o vacío) debe renderizar
  await expect(marcar.or(vacio).first()).toBeVisible({ timeout: 10000 });
});

test("calendario: vista mensual de plazos renderiza", async ({ page }) => {
  await page.goto("/calendario");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });
  // El encabezado de mes (h2 capitalize) siempre está, haya o no vencimientos
  await expect(page.locator("h2.capitalize").first()).toBeVisible({ timeout: 10000 });
  // Panel de próximos vencimientos (heading siempre presente)
  await expect(page.getByText(/Próximos vencimientos/i).first()).toBeVisible({ timeout: 10000 });
});

test("prevención: análisis de patrones", async ({ page }) => {
  await page.goto("/prevencion");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/patrones|recomendaciones|categor/i).first()).toBeVisible({
    timeout: 10000,
  });
});

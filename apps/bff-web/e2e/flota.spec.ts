import { test, expect } from "@playwright/test";
import { uid, borrarPor } from "./lib/helpers";

/**
 * Paridad flota: crear vehículo y conductor desde la UI, verlos en el listado.
 * Limpieza por matrícula/nombre únicos (service_role) en afterEach.
 */
const MATRICULA = `9999 ${uid("PAR").toUpperCase().slice(0, 3)}`;
const CONDUCTOR = `TEST CONDUCTOR ${uid("")}`;

test.afterAll(async () => {
  await borrarPor("vehicles", "registration_number", MATRICULA);
  await borrarPor("drivers", "full_name", CONDUCTOR);
});

test("crear vehículo y verlo en el listado", async ({ page }) => {
  await page.goto("/vehiculos");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: /nuevo vehículo/i }).click();
  await expect(page.getByRole("heading", { name: "Nuevo vehículo" })).toBeVisible();

  await page.locator('input[name="registration_number"]').fill(MATRICULA);
  await page.locator('input[name="brand"]').fill("TestPar");
  await page.locator('input[name="model"]').fill("E2E");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El diálogo cierra y la matrícula aparece en la lista
  await expect(page.getByText(MATRICULA)).toBeVisible({ timeout: 15000 });
});

test("crear conductor y verlo en el listado", async ({ page }) => {
  await page.goto("/conductores");
  await expect(page.getByRole("link", { name: "Sanciones" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: /nuevo conductor/i }).click();
  await expect(page.getByRole("heading", { name: "Nuevo conductor" })).toBeVisible();

  await page.locator('input[name="full_name"]').fill(CONDUCTOR);
  await page.locator('input[name="identification_number"]').fill("00000000T");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText(CONDUCTOR)).toBeVisible({ timeout: 15000 });
});
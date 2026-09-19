import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de Sanciona Fleet contra prod (https://sancionafleet.fexia.es).
 *
 * Verifica paridad funcional vs el prototipo de Lovable (multas-export/).
 * Corre contra prod con la cuenta de prueba cristian@sanciona-fleet.com.
 * Crea datos TEST-PARIDAD-* en la org "cristian" y los limpia en teardown.
 *
 * Uso:
 *   bun run test:e2e                 # todos
 *   bun run test:e2e -- --grep plazos
 *
 * Ver docs/spec/08-paridad-lovable.md para la matriz de paridad.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "https://sancionafleet.fexia.es";
const EMAIL = process.env.E2E_EMAIL ?? "cristian@sanciona-fleet.com";
// NUNCA hardcodear el password aquí — se inyecta vía env (E2E_PASSWORD),
// típicamente desde SSM por scripts/run-e2e.sh. Sin env, el setup falla con
// un mensaje claro en lugar de exponer una credencial en el repo.
const PASSWORD = process.env.E2E_PASSWORD;
if (!PASSWORD) {
  throw new Error(
    "E2E_PASSWORD no definido. Exporta la variable de entorno (ej. vía scripts/run-e2e.sh, que la toma de SSM) antes de correr los E2E.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1, // datos de prueba con IDs únicos; sin paralelismo
  retries: 0, // queremos ver fallos, no enmascararlos
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
      metadata: { email: EMAIL, password: PASSWORD },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
});
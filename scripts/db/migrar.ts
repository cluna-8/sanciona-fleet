/**
 * scripts/db/migrar.ts — Aplica las migraciones SQL pendientes a la base de
 * Postgres de Supabase (local o prod). Sin depender del CLI de Supabase: usa
 * la cadena de conexión directa (pg) y una tabla de control `_schema_migrations`.
 *
 * Uso:
 *   SUPABASE_DB_URL="postgresql://postgres.<ref>:<pass>@aws-0-<reg>.pooler.supabase.com:6543/postgres" \
 *     bun run scripts/db/migrar.ts
 *
 * Opciones (env):
 *   SUPABASE_DB_URL  Cadena de conexión Postgres (pooler de Supabase). Requerida.
 *   MIGRATIONS_DIR   Directorio con los *.sql (default: apps/bff-web/supabase/migrations).
 *   DRY_RUN          "1" para mostrar qué aplicaría sin tocar la base.
 *
 * Comportamiento:
 *   - Ordena los ficheros por nombre (timestamp-prefix) y los aplica en orden.
 *   - Cada migración se ejecuta en una transacción; si falla, aborta sin marcar.
 *   - Registra en `_schema_migrations(filename, applied_at, checksum)`.
 *   - Idempotente: no re-aplica las que ya están registradas.
 *
 * Ver docs/deploy/DATABASE.md y ADR 0001 (Supabase managed).
 */
import pg from "pg";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";

const dbUrl = process.env["SUPABASE_DB_URL"];
const migrationsDir =
  process.env["MIGRATIONS_DIR"] ??
  join(
    import.meta.dir,
    "..",
    "..",
    "apps",
    "bff-web",
    "supabase",
    "migrations",
  );
const dryRun = process.env["DRY_RUN"] === "1";

if (!dbUrl) {
  console.error(
    "Falta SUPABASE_DB_URL (cadena Postgres de Supabase, p.ej. postgresql://postgres.<ref>:<pass>@...).",
  );
  process.exit(2);
}

function listarMigraciones(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => extname(f) === ".sql")
    .sort()
    .map((f) => join(dir, f));
}

async function main() {
  const files = listarMigraciones(migrationsDir);
  if (files.length === 0) {
    console.error(`No hay *.sql en ${migrationsDir}`);
    process.exit(2);
  }
  console.info(`[migrar] ${files.length} ficheros en ${migrationsDir}`);

  const { Client } = pg;
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.info("[migrar] conectado a Postgres");

  // Tabla de control (en public; no se mezcla con auth/realtime de Supabase).
  await client.query(`
    create table if not exists public._schema_migrations (
      filename  text primary key,
      applied_at timestamptz not null default now(),
      checksum  text not null
    );
  `);

  const { rows: applied } = (await client.query(
    "select filename from public._schema_migrations order by filename",
  )) as { rows: { filename: string }[] };
  const aplicados = new Set(applied.map((r) => r.filename));

  let nuevas = 0;
  let saltadas = 0;
  for (const path of files) {
    const filename = path.split("/").pop() ?? path;
    const contenido = readFileSync(path, "utf8");
    const checksum = createHash("sha256").update(contenido).digest("hex");

    if (aplicados.has(filename)) {
      saltadas++;
      continue;
    }

    if (dryRun) {
      console.info(`[migrar] DRY_RUN — aplicaría ${filename}`);
      nuevas++;
      continue;
    }

    console.info(`[migrar] aplicando ${filename} ...`);
    await client.query("begin");
    try {
      await client.query(contenido); // multi-statement (simple query protocol)
      await client.query(
        "insert into public._schema_migrations(filename, checksum) values ($1, $2)",
        [filename, checksum],
      );
      await client.query("commit");
      nuevas++;
    } catch (err) {
      await client.query("rollback");
      console.error(`[migrar] FALLO en ${filename}:`, err);
      await client.end();
      process.exit(1);
    }
  }

  console.info(
    `[migrar] done. ${nuevas} nuevas, ${saltadas} ya aplicadas, ${files.length} total.`,
  );
  await client.end();
}

void main().catch((err) => {
  console.error("[migrar] error inesperado:", err);
  process.exit(1);
});

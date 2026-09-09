/**
 * Validación de la salida del modelo.
 *
 * Un modelo puede devolver un semáforo inventado, una confianza en inglés o un
 * campo de más. Nada de eso debe llegar a la base de datos ni a la UI: aquí se
 * fuerza a los valores del dominio, y ante la duda se elige SIEMPRE el valor
 * más conservador ("Gris", "Bajo"), nunca el más optimista.
 */
import {
  CAMPOS_CRITICOS, CLAVES_EXTRACCION, NIVELES_CONFIANZA, RECOMENDACIONES,
  SEMAFOROS, TIPOS_FACTOR,
  type CampoExtraido, type CamposExtraidos, type Factor, type NivelConfianza,
  type Recomendacion, type ResultadoAnalisis, type Semaforo,
} from "@sanciona/contracts";

const CLAVES_VALIDAS = new Set<string>(CLAVES_EXTRACCION);

function texto(v: unknown, pordefecto = ""): string {
  return typeof v === "string" ? v : v === null || v === undefined ? pordefecto : String(v);
}

function lista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Confianza válida o "Bajo". Ante la duda, se desconfía. */
export function normalizarConfianza(v: unknown): NivelConfianza {
  return NIVELES_CONFIANZA.includes(v as NivelConfianza) ? (v as NivelConfianza) : "Bajo";
}

/** Semáforo válido o "Gris" (= información insuficiente). */
export function normalizarSemaforo(v: unknown): Semaforo {
  return SEMAFOROS.includes(v as Semaforo) ? (v as Semaforo) : "Gris";
}

/** Recomendación válida o "Revisar", que es la que no compromete a nada. */
export function normalizarRecomendacion(v: unknown): Recomendacion {
  return RECOMENDACIONES.includes(v as Recomendacion) ? (v as Recomendacion) : "Revisar";
}

/**
 * Filtra los campos extraídos: descarta claves desconocidas y valores vacíos,
 * y recorta la fuente a 120 caracteres como pide el prompt.
 */
export function normalizarCampos(bruto: unknown): CamposExtraidos {
  const campos: CamposExtraidos = {};
  if (!bruto || typeof bruto !== "object") return campos;

  for (const [clave, valor] of Object.entries(bruto as Record<string, unknown>)) {
    if (!CLAVES_VALIDAS.has(clave)) continue;
    if (!valor || typeof valor !== "object") continue;

    const v = (valor as { valor?: unknown }).valor;
    if (v === null || v === undefined || v === "") continue;

    const normalizado: CampoExtraido["valor"] =
      typeof v === "number" || typeof v === "boolean" ? v : String(v);

    const fuente = (valor as { fuente?: unknown }).fuente;
    campos[clave] = {
      valor: normalizado,
      confianza: normalizarConfianza((valor as { confianza?: unknown }).confianza),
      fuente: typeof fuente === "string" ? fuente.slice(0, 120) : null,
    };
  }
  return campos;
}

/** Claves críticas que el modelo marcó con confianza baja: la UI debe resaltarlas. */
export function camposCriticosDudosos(campos: CamposExtraidos): string[] {
  return CAMPOS_CRITICOS.filter((c) => campos[c]?.confianza === "Bajo");
}

function normalizarFactores(v: unknown): Factor[] {
  return lista(v)
    .map((f) => {
      const o = f as { texto?: unknown; tipo?: unknown };
      const t = texto(o?.texto);
      if (!t) return null;
      const tipo = TIPOS_FACTOR.includes(o?.tipo as never)
        ? (o.tipo as Factor["tipo"])
        : "procedimiento";
      return { texto: t, tipo };
    })
    .filter((f): f is Factor => f !== null);
}

/** Convierte la respuesta cruda del análisis en un ResultadoAnalisis válido. */
export function normalizarAnalisis(bruto: unknown, modelo: string): ResultadoAnalisis {
  const o = (bruto ?? {}) as Record<string, unknown>;
  return {
    recomendacion: normalizarRecomendacion(o["recomendacion"]),
    motivo: texto(o["motivo"]),
    proximo_paso: texto(o["proximo_paso"]),
    nivel_confianza: normalizarConfianza(o["nivel_confianza"]),
    semaforo: normalizarSemaforo(o["semaforo"]),
    factores: normalizarFactores(o["factores"]),
    revision_procedimiento: lista(o["revision_procedimiento"]) as never,
    revision_prueba: lista(o["revision_prueba"]) as never,
    incoherencias: lista(o["incoherencias"]).map((i) => texto(i)).filter(Boolean),
    checklist: lista(o["checklist"]) as never,
    fuentes: lista(o["fuentes"]) as never,
    modelo,
  };
}

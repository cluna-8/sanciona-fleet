/**
 * Esquemas Zod de las server functions de expediente/borradores (hallazgo A-2).
 *
 * Patrón de login.functions.ts: `.inputValidator((data: unknown) =>
 * esquema.parse(data))`. zod 3 hace strip de las claves desconocidas, así que
 * nada no previsto llega a la base de datos ni a los prompts del LLM.
 *
 * Nace con `esquemaExportarBorrador` (Bloque A del plan de export); el resto de
 * las server fns migran aquí en el Bloque E (A-2 completo).
 */
import { z } from "zod";

export const esquemaExportarBorrador = z.object({
  draftId: z.string().uuid(),
  organizationId: z.string().uuid(),
  versionId: z.string().uuid().optional(),
  formato: z.enum(["pdf", "docx"]),
});

export type EntradaExportarBorrador = z.infer<typeof esquemaExportarBorrador>;

export const esquemaProcesarDocumento = z.object({
  extractionId: z.string().uuid(),
});

export const esquemaCrearExpediente = z.object({
  extractionId: z.string().uuid(),
  campos: z.record(
    z.string().max(80),
    z.object({
      valor: z.union([z.string().max(5000), z.number(), z.boolean(), z.null()]),
      // Confianza basura del cliente degrada a "Bajo" en vez de rechazar toda
      // la creación: el flujo de extracción ya pasa por normalizarCampos.
      confianza: z.enum(["Alto", "Medio", "Bajo"]).catch("Bajo"),
      // catch(null): un campo sin fuente explícita se materializa como null,
      // igual que el tipo Campo del dominio (fuente: string | null).
      fuente: z.union([z.string().max(500), z.null()]).catch(null),
    }),
  ),
  vehicleId: z.string().uuid().nullable(),
  driverId: z.string().uuid().nullable(),
  documentType: z.string().min(1).max(120),
  discrepancias: z.array(z.string().max(500)).max(50).optional(),
  camposCorregidos: z.array(z.string().max(80)).max(50).optional(),
  confirmadoPorUsuario: z.boolean().optional(),
});

export const esquemaAnalizarExpediente = z.object({
  sanctionId: z.string().uuid(),
});

export const esquemaGenerarBorrador = z.object({
  sanctionId: z.string().uuid(),
  kind: z.enum(["Alegaciones", "Recurso"]),
});

export const esquemaRecalcularPlazos = z.object({
  sanctionId: z.string().uuid(),
});

/**
 * `inputValidator` con mensaje de error legible para el toast del cliente.
 * TanStack Start envuelve la excepción del validador y el `message` es lo que
 * llega a la UI, así que se construye a partir del primer issue de zod.
 *
 * `ZodTypeAny` + `z.infer<T>` en vez de `ZodType<T>`: los esquemas con
 * `.catch()` tienen Input ≠ Output, y forzar `ZodType<T>` degrada la
 * inferencia a `unknown`.
 */
export function validar<T extends z.ZodTypeAny>(esquema: T) {
  return (data: unknown): z.infer<T> => {
    const resultado = esquema.safeParse(data);
    if (!resultado.success) {
      const primer = resultado.error.issues[0];
      throw new Error(
        `Datos no válidos (${primer?.path.join(".") || "entrada"}): ${primer?.message ?? ""}`,
      );
    }
    return resultado.data;
  };
}

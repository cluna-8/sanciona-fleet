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

/**
 * `inputValidator` con mensaje de error legible para el toast del cliente.
 * TanStack Start envuelve la excepción del validador y el `message` es lo que
 * llega a la UI, así que se construye a partir del primer issue de zod.
 */
export function validar<T>(esquema: z.ZodType<T>) {
  return (data: unknown): T => {
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

import {
  CATEGORIA_POR_TIPO,
  CATEGORIAS_INFRACCION,
  deducirTipoInfraccion,
  esTipoGenerico,
} from "@/lib/validacion-extraccion";
import type { Campos } from "./campos";

/**
 * Convierte valores técnicos en valores presentables y concreta el tipo de
 * infracción. Extraído de `components/alta-documento.tsx` (Etapa 3.8/3.3).
 * Move-only: la lógica es la misma que vivía inline en el wizard.
 */
export function normalizarCampos(entrada: Campos): Campos {
  const campos: Campos = { ...entrada };

  const bruto = campos["requiere_identificacion_conductor"]?.valor;
  let identificacion = "Pendiente de confirmar";
  if (
    bruto === true ||
    String(bruto).trim().toLowerCase() === "true" ||
    String(bruto).trim().toLowerCase() === "sí"
  )
    identificacion = "Sí";
  else if (
    bruto === false ||
    String(bruto).trim().toLowerCase() === "false" ||
    String(bruto).trim().toLowerCase() === "no"
  )
    identificacion = "No";
  campos["requiere_identificacion_conductor"] = {
    valor: identificacion,
    confianza: campos["requiere_identificacion_conductor"]?.confianza ?? "Bajo",
    fuente: campos["requiere_identificacion_conductor"]?.fuente ?? null,
  };

  const tipoActual =
    campos["tipo_infraccion"]?.valor == null ? "" : String(campos["tipo_infraccion"].valor);
  if (esTipoGenerico(tipoActual)) {
    const deducido = deducirTipoInfraccion(
      tipoActual,
      campos["descripcion"]?.valor == null ? null : String(campos["descripcion"].valor),
      campos["hechos_imputados"]?.valor == null ? null : String(campos["hechos_imputados"].valor),
      campos["calificacion"]?.valor == null ? null : String(campos["calificacion"].valor),
      campos["categoria"]?.valor == null ? null : String(campos["categoria"].valor),
    );
    if (deducido) {
      campos["tipo_infraccion"] = {
        valor: deducido,
        confianza: "Medio",
        fuente: "Deducido de los hechos",
      };
    }
  }

  const tipoFinal =
    campos["tipo_infraccion"]?.valor == null ? "" : String(campos["tipo_infraccion"].valor);
  const categoriaActual =
    campos["categoria"]?.valor == null ? "" : String(campos["categoria"].valor);
  const sugerida = CATEGORIA_POR_TIPO[tipoFinal];
  if (sugerida && !CATEGORIAS_INFRACCION.includes(categoriaActual as never)) {
    campos["categoria"] = {
      valor: sugerida,
      confianza: campos["categoria"]?.confianza ?? "Medio",
      fuente: campos["categoria"]?.fuente ?? null,
    };
  }

  return campos;
}

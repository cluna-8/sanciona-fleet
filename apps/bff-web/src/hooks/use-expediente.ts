/**
 * @deprecated Shim de compatibilidad de la Etapa 2 del refactor. La
 * implementación real vive repartida en features/plazos, features/analisis,
 * features/borradores, features/extraccion y features/avisos — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §2. Se retira en Etapa 3.
 */
export { usePlazos, type Plazo } from "@/features/plazos";
export { useAnalisis, type Analisis } from "@/features/analisis";
export {
  useBorradores,
  useBorrador,
  useVersiones,
  type Borrador,
  type VersionBorrador,
} from "@/features/borradores";
export { useExtraccion, type Extraccion } from "@/features/extraccion";
export { useAvisos, type Aviso } from "@/features/avisos";

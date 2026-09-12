/**
 * @deprecated Shim de compatibilidad de la Etapa 2 del refactor. La
 * implementación real (Supabase) vive en features/organizacion — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §2. Se mantiene esta ruta de
 * importación porque la usan ~15 rutas; se retira en Etapa 3.
 */
export {
  useSesion,
  useEmpresaActiva,
  puedeGestionar,
  esAdministrador,
  useEsSuperadmin,
} from "@/features/organizacion";
export type { Organizacion, SesionEmpresa } from "@sanciona/contracts";

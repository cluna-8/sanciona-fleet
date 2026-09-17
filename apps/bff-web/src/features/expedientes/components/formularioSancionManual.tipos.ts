/**
 * Tipos y constantes compartidos del formulario manual de sanción, separados
 * para evitar un ciclo de imports entre el componente raíz y sus secciones
 * (Etapa 3.3). Ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.3.
 */

/** Marca de "sin asignar" para los selects de vehículo/conductor. */
export const SIN_ASIGNAR = "__ninguno__";

/**
 * Valores del formulario manual. Todos string (el server fn valida y coacciona
 * vía `esquemaSancionManual`, el mismo Zod que antes; los errores se reflejan
 * inline con `form.setError`). `vehiculo`/`conductor` viven en el formulario
 * pero se pasan por `opciones` a `useCrearSancionManual`.
 */
export type ValoresFormulario = {
  reference_number: string;
  sanctioning_authority: string;
  sanction_category: string;
  description: string;
  violation_date: string;
  notification_date: string;
  payment_deadline: string;
  appeal_deadline: string;
  original_amount: string;
  discounted_amount: string;
  points: string;
  status: string;
  priority: string;
  notes: string;
  vehiculo: string;
  conductor: string;
};

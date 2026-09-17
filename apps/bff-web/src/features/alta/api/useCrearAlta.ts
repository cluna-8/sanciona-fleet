import { useServerFn } from "@tanstack/react-start";
import { crearAlta } from "./crearAlta";

/**
 * Hook puente para invocar el server fn `crearAlta` desde el cliente — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.7.
 */
export function useCrearAlta() {
  return useServerFn(crearAlta);
}

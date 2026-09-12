export { useVehiculos, useConductores } from "./api/queries";
export {
  useCrearVehiculo,
  useActualizarVehiculo,
  useCrearConductor,
  useActualizarConductor,
} from "./api/mutations";
export { ESTADOS_FLOTA } from "./model/schemas";
export type { Vehiculo, Conductor } from "@sanciona/contracts";

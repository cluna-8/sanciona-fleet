import { z } from "zod";

export const esquemaVehiculo = z.object({
  registration_number: z.string().trim().min(4, "Matrícula no válida").max(15),
  internal_code: z.string().trim().max(30).optional(),
  brand: z.string().trim().max(50).optional(),
  model: z.string().trim().max(50).optional(),
});

export const esquemaConductor = z.object({
  full_name: z.string().trim().min(3, "Indica el nombre completo").max(120),
  identification_number: z.string().trim().max(20).optional(),
  email: z.union([z.string().trim().email("Correo no válido").max(255), z.literal("")]),
  phone: z.string().trim().max(20).optional(),
});

export const ESTADOS_FLOTA = ["activo", "inactivo"];

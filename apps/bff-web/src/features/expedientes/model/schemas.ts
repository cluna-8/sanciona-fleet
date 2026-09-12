import { z } from "zod";

export const esquemaSancionManual = z.object({
  reference_number: z.string().trim().min(3, "Indica el número de expediente").max(80),
  sanctioning_authority: z.string().trim().min(1, "Selecciona el organismo").max(120),
  sanction_category: z.string().trim().min(1, "Selecciona la categoría").max(120),
  description: z.string().trim().max(1000).optional(),
  violation_date: z.string().max(10).optional(),
  notification_date: z.string().max(10).optional(),
  payment_deadline: z.string().max(10).optional(),
  appeal_deadline: z.string().max(10).optional(),
  original_amount: z.coerce.number().min(0, "Importe no válido").max(1_000_000),
  discounted_amount: z.coerce.number().min(0).max(1_000_000).optional(),
  points: z.coerce.number().min(0).max(20).optional(),
  status: z.string(),
  priority: z.string(),
  notes: z.string().trim().max(1000).optional(),
});

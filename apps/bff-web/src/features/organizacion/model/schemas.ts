import { z } from "zod";

export const esquemaInvitacion = z.object({
  email: z.string().trim().email("Correo no válido").max(255),
  full_name: z.string().trim().min(3, "Indica el nombre completo").max(120),
});

export const esquemaOrganizacionNueva = z.object({
  name: z.string().trim().min(2, "Indica el nombre de la empresa").max(150),
  cif: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  contact_email: z.string().trim().max(255).email("Correo no válido").optional().or(z.literal("")),
  contact_phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export const esquemaOrganizacion = z.object({
  name: z.string().trim().min(2, "Indica el nombre de la empresa").max(150),
  cif: z.string().trim().max(20).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  postal_code: z.string().trim().max(10).optional(),
  province: z.string().trim().max(120).optional(),
  contact_name: z.string().trim().max(120).optional(),
  contact_email: z.union([z.string().trim().email("Correo no válido").max(255), z.literal("")]),
  contact_phone: z.string().trim().max(20).optional(),
});

import { z } from "zod";

/** Validación de los datos de la empresa en el paso 1 del alta. */
export const esquemaDatos = z.object({
  email: z.string().trim().email({ message: "Introduce un correo electrónico válido" }).max(255),
  contacto: z.string().trim().min(2, { message: "Indica la persona de contacto" }).max(120),
  empresa: z.string().trim().min(2, { message: "Indica el nombre de la empresa" }).max(150),
  cif: z.string().trim().max(20),
  telefono: z.string().trim().max(30),
  provincia: z.string().trim().max(80),
});

export type DatosAlta = z.infer<typeof esquemaDatos>;

/** Resultado de un alta exitosa (rama `ok: true` de `crearAlta`). */
export type ResultadoAlta = {
  usuario: string;
  email: string;
  password: string;
  correoEnviado: boolean;
  motivoCorreo: string | null;
};

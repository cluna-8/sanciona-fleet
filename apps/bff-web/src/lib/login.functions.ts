import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const esquema = z.object({
  identificador: z.string().trim().min(2).max(255),
});

/**
 * Resuelve un identificador de acceso (correo o nombre de usuario) al correo
 * real de la cuenta. Se ejecuta en servidor para no exponer correos al cliente.
 */
export const resolverIdentificador = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => esquema.parse(data))
  .handler(async ({ data }) => {
    const identificador = data.identificador.trim();
    if (identificador.includes("@")) {
      return { email: identificador.toLowerCase() };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .ilike("username", identificador)
      .maybeSingle();

    return { email: perfil?.email ?? null };
  });

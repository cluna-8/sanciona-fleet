import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const esquemaAlta = z.object({
  email: z.string().trim().email().max(255),
  contacto: z.string().trim().min(2).max(120),
  empresa: z.string().trim().min(2).max(150),
  cif: z.string().trim().max(20).optional().default(""),
  telefono: z.string().trim().max(30).optional().default(""),
  provincia: z.string().trim().max(80).optional().default(""),
  plan: z.enum(["basico", "pro", "empresa"]),
  planNombre: z.string().trim().min(2).max(60),
});

function aleatorio(longitud: number, alfabeto: string) {
  const bytes = new Uint32Array(longitud);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

function generarPassword() {
  const base = aleatorio(10, "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  return `${base}${aleatorio(2, "23456789")}${aleatorio(1, "@#%*")}`;
}

function generarUsuario(empresa: string, email: string) {
  const semilla = (empresa || email.split("@")[0] || "usuario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
  return `${semilla || "usuario"}${aleatorio(4, "0123456789")}`;
}

export const crearAlta = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => esquemaAlta.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enviarCorreo, plantillaCredenciales } = await import("@/lib/email.server");

    const email = data.email.toLowerCase();
    const password = generarPassword();
    const usuario = generarUsuario(data.empresa, email);

    const { data: creado, error: errorAlta } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.contacto, username: usuario },
    });

    if (errorAlta || !creado?.user) {
      const msg = errorAlta?.message ?? "";
      if (/already|registered|exists/i.test(msg)) {
        return {
          ok: false as const,
          error:
            "Ya existe una cuenta con ese correo. Inicia sesión o usa la recuperación de contraseña.",
        };
      }
      console.error("[alta] error creando usuario", errorAlta);
      return { ok: false as const, error: "No se ha podido crear la cuenta. Inténtalo de nuevo." };
    }

    const userId = creado.user.id;

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name: data.contacto,
        username: usuario,
        phone: data.telefono || null,
      },
      { onConflict: "id" },
    );

    // ¿La invitación previa ya le asignó empresa?
    const { data: miembro } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    let organizationId = miembro?.organization_id ?? null;

    if (!organizationId) {
      const { data: org, error: errorOrg } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: data.empresa,
          cif: data.cif || null,
          province: data.provincia || null,
          contact_name: data.contacto,
          contact_email: email,
          contact_phone: data.telefono || null,
          plan: data.plan,
          created_by: userId,
        })
        .select("id")
        .single();
      if (errorOrg || !org) {
        console.error("[alta] error creando empresa", errorOrg);
        return { ok: false as const, error: "La cuenta se ha creado, pero no la empresa." };
      }
      organizationId = org.id;
      await supabaseAdmin.from("organization_members").insert({
        organization_id: organizationId,
        user_id: userId,
        role: "admin_empresa",
        status: "activo",
      });
    } else {
      await supabaseAdmin
        .from("organizations")
        .update({ plan: data.plan })
        .eq("id", organizationId);
    }

    const url = process.env["PUBLIC_SITE_URL"] ?? "https://sanciona.lovable.app";
    const envio = await enviarCorreo({
      to: email,
      subject: "Tus datos de acceso a Sanciona Fleet",
      html: plantillaCredenciales({
        nombreEmpresa: data.empresa,
        usuario,
        email,
        password,
        plan: data.planNombre,
        url,
      }),
    });

    return {
      ok: true as const,
      usuario,
      email,
      password,
      correoEnviado: envio.enviado,
      motivoCorreo: envio.motivo ?? null,
    };
  });

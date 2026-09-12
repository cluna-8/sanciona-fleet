/** Envío de correo transaccional. Server-only. */

type ResultadoEnvio = { enviado: boolean; motivo?: string };

export async function enviarCorreo(opciones: {
  to: string;
  subject: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"] ?? "Sanciona Fleet <onboarding@resend.dev>";
  if (!apiKey) {
    return { enviado: false, motivo: "El envío de correo aún no está configurado." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opciones.to], subject: opciones.subject, html: opciones.html }),
    });
    if (!res.ok) {
      const texto = await res.text();
      console.error("[email] fallo de envío", res.status, texto);
      return { enviado: false, motivo: "El proveedor de correo ha rechazado el envío." };
    }
    return { enviado: true };
  } catch (e) {
    console.error("[email] error de red", e);
    return { enviado: false, motivo: "No se ha podido contactar con el proveedor de correo." };
  }
}

export function plantillaCredenciales(datos: {
  nombreEmpresa: string;
  usuario: string;
  email: string;
  password: string;
  plan: string;
  url: string;
}) {
  return `<!doctype html><html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;padding:32px">
    <h1 style="font-size:20px;margin:0 0 16px">Bienvenido a Sanciona Fleet</h1>
    <p style="margin:0 0 16px">Hemos creado la cuenta de <strong>${datos.nombreEmpresa}</strong> con el plan <strong>${datos.plan}</strong>.</p>
    <p style="margin:0 0 8px">Estos son tus datos de acceso:</p>
    <table style="border-collapse:collapse;margin:0 0 20px">
      <tr><td style="padding:6px 12px 6px 0">Usuario</td><td style="padding:6px 0"><strong>${datos.usuario}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0">Correo de acceso</td><td style="padding:6px 0"><strong>${datos.email}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0">Contraseña</td><td style="padding:6px 0"><strong>${datos.password}</strong></td></tr>
    </table>
    <p style="margin:0 0 20px"><a href="${datos.url}/auth" style="background:#0f172a;color:#ffffff;padding:12px 20px;text-decoration:none;display:inline-block">Acceder a la plataforma</a></p>
    <p style="margin:0;font-size:12px;color:#64748b">Por seguridad, cambia la contraseña después del primer acceso desde "¿Has olvidado la contraseña?".</p>
  </div></body></html>`;
}

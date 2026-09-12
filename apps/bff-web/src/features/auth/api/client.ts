/** Único módulo que conoce supabase.auth. Ver SPEC.md §7.1 (identity-service,
 * delegado a Supabase Auth) y el plan de refactor §2. */
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

export async function obtenerUsuarioActual(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Lanza si no hay sesión — para usar en beforeLoad de rutas protegidas. */
export async function requerirUsuario(): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("No autenticado");
  return data.user;
}

export function suscribirCambiosAuth(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function obtenerSesionActual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function actualizarContrasena(password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error?.message ?? null };
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut();
}

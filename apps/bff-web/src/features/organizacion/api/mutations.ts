import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ValidationError } from "@/shared/lib/errores";
import { organizacionKeys } from "./keys";
import {
  crearOrganizacion,
  altaMiembroAdmin,
  actualizarOrganizacion,
  cambiarRolMiembro,
  crearInvitacion,
  eliminarInvitacion,
  type NuevaOrganizacion,
  type CambiosOrganizacion,
} from "./client";

export function useCrearOrganizacionYAsignarme(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datos: NuevaOrganizacion) => {
      if (!userId) throw new Error("Sesión no válida");
      const id = await crearOrganizacion(datos);
      await altaMiembroAdmin(id, userId);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useActualizarOrganizacion(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cambios: CambiosOrganizacion) => {
      if (!id) throw new Error("Sin empresa activa");
      await actualizarOrganizacion(id, cambios);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizacionKeys.sesion() }),
  });
}

export function useCambiarRolMiembro(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: string }) => cambiarRolMiembro(id, rol),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizacionKeys.miembros(orgId) }),
  });
}

function parsearOFallar<T>(
  esquema: { safeParse: (v: unknown) => import("zod").SafeParseReturnType<unknown, T> },
  bruto: Record<string, string>,
): T {
  const parsed = esquema.safeParse(bruto);
  if (!parsed.success) {
    const errores: Record<string, string> = {};
    for (const i of parsed.error.issues) errores[String(i.path[0])] = i.message;
    throw new ValidationError(errores);
  }
  return parsed.data;
}

export function useCrearInvitacion(orgId: string, userId: string, rol: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) => {
      const { esquemaInvitacion } = await import("../model/schemas");
      const d = parsearOFallar(esquemaInvitacion, {
        email: String(form.get("email") ?? ""),
        full_name: String(form.get("full_name") ?? ""),
      });
      await crearInvitacion({
        organization_id: orgId,
        email: d.email.toLowerCase(),
        full_name: d.full_name,
        role: rol,
        invited_by: userId,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizacionKeys.invitaciones(orgId) }),
  });
}

export function useEliminarInvitacion(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eliminarInvitacion,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizacionKeys.invitaciones(orgId) }),
  });
}

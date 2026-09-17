import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AppShell } from "@/shared/components/AppShell";
import {
  useSesion,
  esAdministrador,
  useActualizarOrganizacion,
  esquemaOrganizacion,
} from "@/features/organizacion";
import { ValidationError } from "@/shared/lib/errores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { etiquetaRol } from "@/shared/lib/formato";

export const Route = createFileRoute("/_authenticated/empresa")({
  component: Empresa,
});

function Empresa() {
  const { data: sesion } = useSesion();
  const org = sesion?.organization;
  const admin = esAdministrador(sesion?.role);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const guardarMut = useActualizarOrganizacion(org?.id);
  const guardar = {
    isPending: guardarMut.isPending,
    mutate: (form: FormData) => {
      const parsed = esquemaOrganizacion.safeParse({
        name: String(form.get("name") ?? ""),
        cif: String(form.get("cif") ?? ""),
        address: String(form.get("address") ?? ""),
        city: String(form.get("city") ?? ""),
        postal_code: String(form.get("postal_code") ?? ""),
        province: String(form.get("province") ?? ""),
        contact_name: String(form.get("contact_name") ?? ""),
        contact_email: String(form.get("contact_email") ?? ""),
        contact_phone: String(form.get("contact_phone") ?? ""),
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
        setErrores(errs);
        toast.error("Revisa los campos marcados");
        return;
      }
      setErrores({});
      const d = parsed.data;
      guardarMut.mutate(
        {
          name: d.name,
          cif: d.cif || null,
          address: d.address || null,
          city: d.city || null,
          postal_code: d.postal_code || null,
          province: d.province || null,
          contact_name: d.contact_name || null,
          contact_email: d.contact_email || null,
          contact_phone: d.contact_phone || null,
        },
        {
          onSuccess: () => toast.success("Datos de la empresa actualizados"),
          onError: (e: Error) => {
            if (e instanceof ValidationError) setErrores(e.fieldErrors);
            toast.error(e.message);
          },
        },
      );
    },
  };

  return (
    <AppShell titulo="Configuración de la empresa" descripcion="Datos fiscales y de contacto">
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          className="card-surface space-y-4 p-5 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            guardar.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Razón social</Label>
            <Input name="name" defaultValue={org?.name ?? ""} maxLength={150} disabled={!admin} />
            {errores["name"] && <p className="text-xs text-destructive">{errores["name"]}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CIF</Label>
              <Input name="cif" defaultValue={org?.cif ?? ""} maxLength={20} disabled={!admin} />
            </div>
            <div className="space-y-1.5">
              <Label>Persona de contacto</Label>
              <Input
                name="contact_name"
                defaultValue={org?.contact_name ?? ""}
                maxLength={120}
                disabled={!admin}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Correo de contacto</Label>
              <Input
                name="contact_email"
                type="email"
                defaultValue={org?.contact_email ?? ""}
                maxLength={255}
                disabled={!admin}
              />
              {errores["contact_email"] && (
                <p className="text-xs text-destructive">{errores["contact_email"]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                name="contact_phone"
                defaultValue={org?.contact_phone ?? ""}
                maxLength={20}
                disabled={!admin}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Textarea
              name="address"
              defaultValue={org?.address ?? ""}
              maxLength={300}
              rows={3}
              disabled={!admin}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Localidad</Label>
              <Input name="city" defaultValue={org?.city ?? ""} maxLength={120} disabled={!admin} />
            </div>
            <div className="space-y-1.5">
              <Label>Código postal</Label>
              <Input
                name="postal_code"
                defaultValue={org?.postal_code ?? ""}
                maxLength={10}
                disabled={!admin}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Provincia</Label>
              <Input
                name="province"
                defaultValue={org?.province ?? ""}
                maxLength={120}
                disabled={!admin}
              />
            </div>
          </div>

          {admin ? (
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Solo el administrador de la empresa puede modificar estos datos.
            </p>
          )}
        </form>

        <div className="card-surface h-fit p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-navy" />
            <h2 className="text-base font-semibold">Tu acceso</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Usuario</dt>
              <dd className="font-medium">{sesion?.fullName || sesion?.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Correo</dt>
              <dd>{sesion?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rol</dt>
              <dd className="font-medium text-navy">{etiquetaRol(sesion?.role)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </AppShell>
  );
}

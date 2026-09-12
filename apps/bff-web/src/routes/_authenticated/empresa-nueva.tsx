import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/empresa-nueva")({
  component: NuevaEmpresa,
});

const esquema = z.object({
  name: z.string().trim().min(2, "Indica el nombre de la empresa").max(150),
  cif: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  contact_email: z.string().trim().max(255).email("Correo no válido").optional().or(z.literal("")),
  contact_phone: z.string().trim().max(30).optional().or(z.literal("")),
});

function NuevaEmpresa() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sesion, isLoading } = useSesion();
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!isLoading && sesion?.organization) navigate({ to: "/dashboard", replace: true });
  }, [isLoading, sesion, navigate]);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = esquema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) {
      toast.error("Revisa los datos", { description: parsed.error.issues[0]?.message });
      return;
    }
    setCargando(true);
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({
        name: parsed.data.name,
        cif: parsed.data.cif || null,
        address: parsed.data.address || null,
        contact_name: parsed.data.contact_name || null,
        contact_email: parsed.data.contact_email || null,
        contact_phone: parsed.data.contact_phone || null,
      })
      .select("id")
      .single();

    if (error || !org) {
      setCargando(false);
      toast.error("No se ha podido crear la empresa", { description: error?.message });
      return;
    }

    const { error: errorMiembro } = await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: sesion!.userId,
      role: "admin_empresa",
      status: "activo",
    });
    setCargando(false);
    if (errorMiembro) {
      toast.error("No se ha podido asignar tu usuario a la empresa", {
        description: errorMiembro.message,
      });
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Empresa creada correctamente");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent" />
          <span className="font-display text-lg font-bold">Sanciona Fleet</span>
        </div>

        <h1 className="font-display text-2xl font-bold">Configura tu empresa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Da de alta los datos de tu empresa para empezar a registrar sanciones desde cero. Serás su
          administrador.
        </p>

        <form onSubmit={crear} className="card-surface mt-6 space-y-5 p-6">
          <div className="flex items-center gap-2 text-navy">
            <Building2 className="h-5 w-5" />
            <h2 className="text-base font-semibold">Datos de la empresa</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Razón social *</Label>
              <Input id="name" name="name" maxLength={150} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif">CIF</Label>
              <Input id="cif" name="cif" maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Teléfono de contacto</Label>
              <Input id="contact_phone" name="contact_phone" maxLength={30} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea id="address" name="address" maxLength={300} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Persona de contacto</Label>
              <Input id="contact_name" name="contact_name" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Correo de contacto</Label>
              <Input id="contact_email" name="contact_email" type="email" maxLength={255} />
            </div>
          </div>
          <Button type="submit" disabled={cargando}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear empresa
          </Button>
        </form>
      </div>
    </div>
  );
}

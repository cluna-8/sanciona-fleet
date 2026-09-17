import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCrearInvitacion } from "@/features/organizacion";
import { ValidationError } from "@/shared/lib/errores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES } from "@sanciona/contracts";

/**
 * Diálogo de invitación de usuario. Antes era el sub-componente `InvitarUsuario`
 * inline en usuarios.tsx — ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.5.
 */
export function InvitarUsuario({ orgId, userId }: { orgId: string; userId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [rol, setRol] = useState<string>("gestor_sanciones");
  const [errores, setErrores] = useState<Record<string, string>>({});

  const invitarMut = useCrearInvitacion(orgId, userId, rol);
  const invitar = {
    isPending: invitarMut.isPending,
    mutate: (form: FormData) => {
      setErrores({});
      invitarMut.mutate(form, {
        onSuccess: () => {
          setAbierto(false);
          toast.success("Usuario invitado. Accederá a la empresa al registrarse con ese correo.");
        },
        onError: (e: Error) => {
          if (e instanceof ValidationError) setErrores(e.fieldErrors);
          toast.error(e.message);
        },
      });
    },
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Añadir usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir usuario a la empresa</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            invitar.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input name="full_name" maxLength={120} required />
            {errores["full_name"] && (
              <p className="text-xs text-destructive">{errores["full_name"]}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Correo electrónico</Label>
            <Input name="email" type="email" maxLength={255} required />
            {errores["email"] && <p className="text-xs text-destructive">{errores["email"]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={setRol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Cuando esta persona cree su cuenta con ese correo, entrará directamente en la empresa
            con el rol asignado.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={invitar.isPending}>
              {invitar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

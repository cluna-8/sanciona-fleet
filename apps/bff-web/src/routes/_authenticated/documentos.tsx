import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FolderClosed } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useSesion } from "@/hooks/use-org";
import { useDocumentosOrganizacion, enlaceDescarga } from "@/features/documentos";
import { formatoFecha, TIPOS_DOCUMENTO } from "@/lib/fleet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/documentos")({
  component: Documentos,
  head: () => ({
    meta: [
      { title: "Documentos | Sanciona Fleet" },
      {
        name: "description",
        content:
          "Repositorio privado de documentación asociada a los expedientes sancionadores de la empresa.",
      },
      { property: "og:title", content: "Documentos | Sanciona Fleet" },
      {
        property: "og:description",
        content: "Documentación de expedientes sancionadores en un almacén privado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const TODOS = "__todos__";

function Documentos() {
  const { data: sesion } = useSesion();
  const orgId = sesion?.organization?.id;
  const [tipo, setTipo] = useState(TODOS);
  const [busqueda, setBusqueda] = useState("");

  const { data, isLoading } = useDocumentosOrganizacion(orgId);

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      if (tipo !== TODOS && d.document_type !== tipo) return false;
      if (!t) return true;
      return [d.file_name, d.sanctions?.reference_number, d.document_type].some((c) =>
        c?.toLowerCase().includes(t),
      );
    });
  }, [data, tipo, busqueda]);

  async function descargar(ruta: string) {
    const url = await enlaceDescarga(ruta);
    if (!url) {
      toast.error("No se ha podido generar el enlace de descarga");
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  return (
    <AppShell
      titulo="Documentos"
      descripcion="Documentación de expedientes almacenada en un repositorio privado"
    >
      <div className="card-surface p-4">
        <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo de documento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {TIPOS_DOCUMENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Búsqueda</Label>
            <Input
              placeholder="Nombre de archivo o número de expediente"
              value={busqueda}
              maxLength={120}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-surface mt-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-[13px] text-muted-foreground">
          <FolderClosed className="h-4 w-4 text-navy" />
          {filtrados.length} de {(data ?? []).length} documentos
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            No hay documentos registrados con los criterios indicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Archivo</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Expediente</th>
                  <th className="px-4 py-2 font-medium">Fecha de subida</th>
                  <th className="px-4 py-2 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="px-4 py-2 font-medium text-foreground">{d.file_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.document_type ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Link
                        to="/sanciones/$id"
                        params={{ id: d.sanction_id }}
                        className="text-navy hover:underline"
                      >
                        {d.sanctions?.reference_number ?? "Ver expediente"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 tabular-nums text-muted-foreground">
                      {formatoFecha(d.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => descargar(d.file_path)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

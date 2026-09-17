import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { useDocumentosSancion, enlaceDescarga, type DocumentoSancion } from "@/features/documentos";
import { Button } from "@/components/ui/button";
import { formatoFecha } from "@/shared/lib/formato";

/**
 * Listado de documentos adjuntos de un expediente con descarga. Antes era el
 * bloque `Documentos` inline en sanciones.$id.tsx — ver
 * docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.2.
 */
export function ListaDocumentos({ sancionId }: { sancionId: string }) {
  const { data: documentos } = useDocumentosSancion(sancionId);

  async function descargar(doc: DocumentoSancion) {
    const url = await enlaceDescarga(doc.file_path);
    if (!url) {
      toast.error("No se pudo generar el enlace de descarga");
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <FileText className="h-4 w-4 text-navy" />
        <h2 className="text-base font-semibold">Documentos</h2>
      </div>
      {!documentos || documentos.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No hay documentos adjuntos en este expediente.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.document_type} · {formatoFecha(d.created_at.slice(0, 10))}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => descargar(d)}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Descargar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

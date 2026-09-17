import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_DOCUMENTO } from "@sanciona/contracts";
import type { EstadoWizard } from "../model/wizardReducer";

const EXTENSIONES = [".pdf", ".jpg", ".jpeg", ".png"];
const PASOS = [
  "Documento recibido",
  "Procesando documento",
  "Revisar información",
  "Expediente creado",
];

function formatoTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function archivoValido(f: File) {
  const nombre = f.name.toLowerCase();
  return EXTENSIONES.some((e) => nombre.endsWith(e));
}

/** Cabecera del wizard (título + descripción + stepper). */
export function CabeceraWizard({ paso }: { paso: number }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <FileUp className="h-4 w-4 text-navy" />
        <h2 className="text-base font-semibold">Subir documento de sanción</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Sube la notificación en PDF, JPG, JPEG o PNG. El documento se guarda en almacenamiento
        privado y queda asociado al expediente.
      </p>
      <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {PASOS.map((p, i) => (
          <li
            key={p}
            className={`flex items-center gap-1.5 ${i <= paso ? "text-navy" : "text-muted-foreground"}`}
          >
            {i < paso ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <span className="text-[10px]">{i + 1}.</span>
            )}
            {p}
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Paso 1 del wizard: zona de arrastre, vista previa, tipo de documento y
 * botón Procesar. Se muestra mientras `paso < 2`.
 */
export function PasoDocumento({
  estado,
  procesando,
  onElegirArchivo,
  onQuitarArchivo,
  onCambiarTipoDoc,
  onProcesar,
}: {
  estado: EstadoWizard;
  procesando: boolean;
  onElegirArchivo: (f: File | null) => void;
  onQuitarArchivo: () => void;
  onCambiarTipoDoc: (tipoDoc: string) => void;
  onProcesar: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const archivo = estado.archivo;

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  function elegir(f: File | null) {
    if (!f) return;
    if (!archivoValido(f)) {
      toast.error("Formato no admitido. Usa PDF, JPG, JPEG o PNG.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("El documento supera los 15 MB");
      return;
    }
    onElegirArchivo(f);
  }

  return (
    <div className="mt-4 space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          elegir(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          elegir(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex flex-col items-center justify-center border border-dashed px-6 py-8 text-center transition-colors ${
          arrastrando ? "border-navy bg-navy/5" : "border-border"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-navy" />
        <Button type="button" className="mt-3" onClick={() => inputRef.current?.click()}>
          Seleccionar archivo
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">o arrastra aquí el documento</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Formatos admitidos: PDF, JPG, JPEG y PNG (máximo 15 MB)
        </p>
      </div>

      {archivo && (
        <div className="border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{archivo.name}</p>
              <p className="text-xs text-muted-foreground">{formatoTamano(archivo.size)}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onQuitarArchivo}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Eliminar
            </Button>
          </div>
          {vistaPrevia && archivo.type.startsWith("image/") && (
            <img
              src={vistaPrevia}
              alt={`Vista previa de ${archivo.name}`}
              className="mt-3 max-h-64 w-auto max-w-full object-contain"
            />
          )}
          {vistaPrevia && archivo.type === "application/pdf" && (
            <object
              data={vistaPrevia}
              type="application/pdf"
              className="mt-3 h-64 w-full border border-border"
              aria-label={`Vista previa de ${archivo.name}`}
            >
              <p className="p-3 text-xs text-muted-foreground">
                Vista previa no disponible en este navegador.
              </p>
            </object>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[220px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo de documento</Label>
          <Select value={estado.tipoDoc} onValueChange={onCambiarTipoDoc}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DOCUMENTO.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onProcesar} disabled={procesando || !archivo}>
          {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Procesar documento
        </Button>
      </div>

      {estado.estado && (
        <p className="mt-3 text-xs text-muted-foreground">Estado: {estado.estado}</p>
      )}
    </div>
  );
}

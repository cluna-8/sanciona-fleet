import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileUp, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { procesarDocumento, crearExpedienteDesdeExtraccion } from "@/lib/expediente.functions";
import { useVehiculos, useConductores } from "@/features/flota";
import { useSesion } from "@/hooks/use-org";
import { ETIQUETAS_CAMPO, ORDEN_CAMPOS, esCampoCritico } from "@/lib/analisis";
import { TIPOS_DOCUMENTO } from "@/lib/fleet";
import {
  CATEGORIAS_INFRACCION,
  CATEGORIA_POR_TIPO,
  OPCIONES_IDENTIFICACION,
  TIPOS_INFRACCION,
  compararEmpresa,
  deducirTipoInfraccion,
  esTipoGenerico,
  validarAntesDeCrear,
  type ComparacionEmpresa,
} from "@/lib/validacion-extraccion";

type Campo = { valor: string | number | boolean | null; confianza: string; fuente?: string | null };
type Campos = Record<string, Campo>;

const SIN_ASIGNAR = "__ninguno__";

const PASOS = [
  "Documento recibido",
  "Procesando documento",
  "Revisar información",
  "Expediente creado",
];

const EXTENSIONES = [".pdf", ".jpg", ".jpeg", ".png"];

function formatoTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function archivoValido(f: File) {
  const nombre = f.name.toLowerCase();
  return EXTENSIONES.some((e) => nombre.endsWith(e));
}

/** Convierte valores técnicos en valores presentables y concreta el tipo de infracción. */
function normalizarCampos(entrada: Campos): Campos {
  const campos: Campos = { ...entrada };

  const bruto = campos["requiere_identificacion_conductor"]?.valor;
  let identificacion = "Pendiente de confirmar";
  if (
    bruto === true ||
    String(bruto).trim().toLowerCase() === "true" ||
    String(bruto).trim().toLowerCase() === "sí"
  )
    identificacion = "Sí";
  else if (
    bruto === false ||
    String(bruto).trim().toLowerCase() === "false" ||
    String(bruto).trim().toLowerCase() === "no"
  )
    identificacion = "No";
  campos["requiere_identificacion_conductor"] = {
    valor: identificacion,
    confianza: campos["requiere_identificacion_conductor"]?.confianza ?? "Bajo",
    fuente: campos["requiere_identificacion_conductor"]?.fuente ?? null,
  };

  const tipoActual =
    campos["tipo_infraccion"]?.valor == null ? "" : String(campos["tipo_infraccion"].valor);
  if (esTipoGenerico(tipoActual)) {
    const deducido = deducirTipoInfraccion(
      tipoActual,
      campos["descripcion"]?.valor == null ? null : String(campos["descripcion"].valor),
      campos["hechos_imputados"]?.valor == null ? null : String(campos["hechos_imputados"].valor),
      campos["calificacion"]?.valor == null ? null : String(campos["calificacion"].valor),
      campos["categoria"]?.valor == null ? null : String(campos["categoria"].valor),
    );
    if (deducido) {
      campos["tipo_infraccion"] = {
        valor: deducido,
        confianza: "Medio",
        fuente: "Deducido de los hechos",
      };
    }
  }

  const tipoFinal =
    campos["tipo_infraccion"]?.valor == null ? "" : String(campos["tipo_infraccion"].valor);
  const categoriaActual =
    campos["categoria"]?.valor == null ? "" : String(campos["categoria"].valor);
  const sugerida = CATEGORIA_POR_TIPO[tipoFinal];
  if (sugerida && !CATEGORIAS_INFRACCION.includes(categoriaActual as never)) {
    campos["categoria"] = {
      valor: sugerida,
      confianza: campos["categoria"]?.confianza ?? "Medio",
      fuente: campos["categoria"]?.fuente ?? null,
    };
  }

  return campos;
}

export function AltaDesdeDocumento({
  orgId,
  userId,
}: {
  orgId?: string | undefined;
  userId?: string | undefined;
}) {
  const navigate = useNavigate();
  const { data: vehiculos } = useVehiculos(orgId);
  const { data: conductores } = useConductores(orgId);
  const { data: sesion } = useSesion();
  const empresa = sesion?.organization ?? null;

  const inputRef = useRef<HTMLInputElement>(null);
  const revisionRef = useRef<HTMLParagraphElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [tipoDoc, setTipoDoc] = useState<string>(TIPOS_DOCUMENTO[0]!);
  const [paso, setPaso] = useState(0);
  const [estado, setEstado] = useState<string>("");
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [campos, setCampos] = useState<Campos>({});
  const [avisos, setAvisos] = useState<string[]>([]);
  const [vehiculo, setVehiculo] = useState(SIN_ASIGNAR);
  const [conductor, setConductor] = useState(SIN_ASIGNAR);
  const [camposOriginales, setCamposOriginales] = useState<Campos>({});
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!archivo) {
      setVistaPrevia(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVistaPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  function elegirArchivo(f: File | null) {
    if (!f) return;
    if (!archivoValido(f)) {
      toast.error("Formato no admitido. Usa PDF, JPG, JPEG o PNG.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("El documento supera los 15 MB");
      return;
    }
    setArchivo(f);
    setEstado("");
    setPaso(0);
  }

  function quitarArchivo() {
    setArchivo(null);
    setEstado("");
    setPaso(0);
    setExtractionId(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const fnProcesar = useServerFn(procesarDocumento);
  const fnCrear = useServerFn(crearExpedienteDesdeExtraccion);

  const procesar = useMutation({
    mutationFn: async () => {
      if (!archivo) throw new Error("Selecciona un documento (PDF, JPG o PNG)");
      if (!orgId || !userId) throw new Error("Tu usuario no tiene una empresa activa asignada");
      setPaso(1);
      setEstado("Documento recibido");

      const ruta = `${orgId}/entrada/${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
      const { error: errorSubida } = await supabase.storage
        .from("sanction-documents")
        .upload(ruta, archivo, archivo.type ? { contentType: archivo.type } : {});
      if (errorSubida) throw errorSubida;

      const { data: extraccion, error } = await supabase
        .from("sanction_extractions")
        .insert({
          organization_id: orgId,
          file_name: archivo.name,
          file_path: ruta,
          mime_type: archivo.type || "application/pdf",
          status: "Documento recibido",
          created_by: userId,
        } as never)
        .select("id")
        .single();
      if (error || !extraccion) {
        if (error?.message?.toLowerCase().includes("row-level security")) {
          throw new Error(
            "No tienes permisos sobre esta empresa para registrar documentos. Comprueba que tu usuario sigue activo en la empresa.",
          );
        }
        throw error ?? new Error("No se ha podido registrar el documento");
      }

      setExtractionId(extraccion.id);
      setEstado("Procesando documento");
      try {
        const resultado = await fnProcesar({ data: { extractionId: extraccion.id } });
        return { ok: true as const, resultado };
      } catch (e) {
        console.error("[alta-documento] procesamiento no disponible", e);
        return { ok: false as const, motivo: (e as Error).message };
      }
    },
    onSuccess: (salida) => {
      if (!salida.ok) {
        setPaso(1);
        setEstado("Documento subido correctamente. Pendiente de procesamiento.");
        toast.success("Documento subido correctamente. Pendiente de procesamiento.");
        return;
      }
      const resultado = salida.resultado;
      const normalizados = normalizarCampos(resultado.campos as Campos);
      setCampos(normalizados);
      setCamposOriginales(normalizados);
      setConfirmado(false);
      setAvisos(resultado.avisos ?? []);
      setEstado(resultado.estado);
      if (resultado.sugerencias?.vehicleId) setVehiculo(resultado.sugerencias.vehicleId);
      if (resultado.sugerencias?.driverId) setConductor(resultado.sugerencias.driverId);
      setPaso(2);
      toast.success(resultado.estado);
    },
    onError: (e: Error) => {
      setPaso(0);
      setEstado("No se ha podido subir el documento");
      toast.error(e.message);
    },
  });

  const comparacion: ComparacionEmpresa = compararEmpresa(empresa, {
    razonSocial:
      campos["razon_social"]?.valor == null ? null : String(campos["razon_social"].valor),
    cif: campos["cif_nif"]?.valor == null ? null : String(campos["cif_nif"].valor),
  });
  const discrepanciaCif = comparacion.cifComparable && !comparacion.cifCoincide;
  const incidencias = paso >= 2 ? validarAntesDeCrear(campos, comparacion) : [];
  const camposCorregidos = Object.keys(campos).filter(
    (c) => String(campos[c]?.valor ?? "") !== String(camposOriginales[c]?.valor ?? ""),
  );

  const crear = useMutation({
    mutationFn: async () => {
      if (!extractionId) throw new Error("Procesa antes el documento");
      if (discrepanciaCif && !confirmado) {
        throw new Error("Confirma la discrepancia de CIF antes de crear el expediente");
      }
      return fnCrear({
        data: {
          extractionId,
          campos: campos as never,
          vehicleId: vehiculo === SIN_ASIGNAR ? null : vehiculo,
          driverId: conductor === SIN_ASIGNAR ? null : conductor,
          documentType: tipoDoc,
          discrepancias: incidencias.map((i) => i.mensaje),
          confirmadoPorUsuario: confirmado,
          camposCorregidos: camposCorregidos.map((c) => ETIQUETAS_CAMPO[c] ?? c),
        },
      });
    },
    onSuccess: ({ sanctionId }) => {
      setPaso(3);
      toast.success("Expediente creado");
      navigate({ to: "/sanciones/$id", params: { id: sanctionId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function actualizar(clave: string, valor: string) {
    setCampos((prev) => ({
      ...prev,
      [clave]: {
        valor,
        confianza: prev[clave]?.confianza ?? "Alto",
        fuente: prev[clave]?.fuente ?? null,
      },
    }));
  }

  const clavesVisibles = ORDEN_CAMPOS.filter((c) => campos[c] !== undefined || esCampoCritico(c));

  return (
    <div className="card-surface p-5">
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

      {paso < 2 && (
        <div className="mt-4 space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              elegirArchivo(e.target.files?.[0] ?? null);
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
              elegirArchivo(e.dataTransfer.files?.[0] ?? null);
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
                <Button type="button" variant="ghost" size="sm" onClick={quitarArchivo}>
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
              <Select value={tipoDoc} onValueChange={setTipoDoc}>
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
            <Button onClick={() => procesar.mutate()} disabled={procesar.isPending || !archivo}>
              {procesar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Procesar documento
            </Button>
          </div>
        </div>
      )}

      {estado && paso < 2 && <p className="mt-3 text-xs text-muted-foreground">Estado: {estado}</p>}

      {paso >= 2 && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
              {estado}
            </span>
            {avisos.map((a, i) => (
              <span
                key={i}
                className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] text-accent"
              >
                {a}
              </span>
            ))}
          </div>

          {discrepanciaCif && (
            <div className="border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">
                El CIF del documento no coincide con el CIF de la empresa activa.
              </p>
              <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">CIF empresa activa</dt>
                  <dd className="font-medium">
                    {comparacion.cifEmpresa || "Pendiente de confirmar"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">CIF detectado en el documento</dt>
                  <dd className="font-medium">
                    {comparacion.cifDocumento || "Pendiente de confirmar"}
                  </dd>
                </div>
              </dl>
              {comparacion.nombreComparable && !comparacion.nombreCoincide && (
                <p className="mt-2 text-xs text-muted-foreground">
                  La razón social también difiere: «{comparacion.nombreDocumento}» frente a «
                  {comparacion.nombreEmpresa}» (comprobación orientativa).
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirmado(false);
                    revisionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Revisar información
                </Button>
                <Button type="button" size="sm" onClick={() => setConfirmado(true)}>
                  Continuar de todos modos
                </Button>
              </div>
              {confirmado && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Has confirmado continuar. La discrepancia quedará registrada en el historial del
                  expediente.
                </p>
              )}
            </div>
          )}

          <p
            ref={revisionRef}
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Revisar información extraída
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {clavesVisibles.map((clave) => {
              const campo = campos[clave];
              const dudoso = !campo || campo.confianza === "Bajo";
              const valor =
                campo?.valor === null || campo?.valor === undefined ? "" : String(campo.valor);
              const opciones =
                clave === "requiere_identificacion_conductor"
                  ? [...OPCIONES_IDENTIFICACION]
                  : clave === "tipo_infraccion"
                    ? [...TIPOS_INFRACCION]
                    : clave === "categoria"
                      ? [...CATEGORIAS_INFRACCION]
                      : null;
              const listaOpciones =
                opciones && valor && !opciones.includes(valor as never)
                  ? [valor, ...opciones]
                  : opciones;
              return (
                <div key={clave} className="space-y-1">
                  <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                    {ETIQUETAS_CAMPO[clave] ?? clave}
                    {dudoso && esCampoCritico(clave) && (
                      <span className="rounded-full border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                        Verificar dato
                      </span>
                    )}
                  </Label>
                  {listaOpciones ? (
                    <Select
                      value={
                        valor ||
                        (clave === "requiere_identificacion_conductor"
                          ? "Pendiente de confirmar"
                          : "")
                      }
                      onValueChange={(v) => actualizar(clave, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pendiente de confirmar" />
                      </SelectTrigger>
                      <SelectContent>
                        {listaOpciones.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={valor} onChange={(e) => actualizar(clave, e.target.value)} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vehículo</Label>
              <Select value={vehiculo} onValueChange={setVehiculo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_ASIGNAR}>Vehículo no localizado</SelectItem>
                  {(vehiculos ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Conductor</Label>
              <Select value={conductor} onValueChange={setConductor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_ASIGNAR}>Conductor pendiente de identificar</SelectItem>
                  {(conductores ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {incidencias.length > 0 && (
            <div className="border border-accent/40 bg-accent/10 p-4">
              <p className="text-sm font-semibold text-accent">
                Comprobaciones previas a la creación
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground">
                {incidencias.map((i, n) => (
                  <li key={`${i.clave}-${n}`}>{i.mensaje}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Puedes corregir los datos arriba antes de continuar. No se completa ningún dato
                automáticamente.
              </p>
            </div>
          )}

          <Button
            onClick={() => crear.mutate()}
            disabled={crear.isPending || (discrepanciaCif && !confirmado)}
          >
            {crear.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear expediente con esta información
          </Button>
          {discrepanciaCif && !confirmado && (
            <p className="text-xs text-muted-foreground">
              Confirma la discrepancia de CIF con «Continuar de todos modos» para poder crear el
              expediente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

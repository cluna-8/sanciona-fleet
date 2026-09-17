import { useRef, type RefObject } from "react";
import { Loader2 } from "lucide-react";
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
import { ETIQUETAS_CAMPO, esCampoCritico } from "@/lib/analisis";
import {
  CATEGORIAS_INFRACCION,
  OPCIONES_IDENTIFICACION,
  TIPOS_INFRACCION,
  type ComparacionEmpresa,
  type Incidencia,
} from "@/lib/validacion-extraccion";
import { SIN_ASIGNAR, type EstadoWizard } from "../model/wizardReducer";

type Vehiculo = { id: string; registration_number: string };
type Conductor = { id: string; full_name: string };

/**
 * Paso 2/3 del wizard: revisión de los datos extraídos, discrepancia de CIF,
 * asignación de vehículo/conductor, incidencias previas y creación del
 * expediente. Se muestra cuando `paso >= 2`.
 */
export function PasoRevision({
  estado,
  comparacion,
  discrepanciaCif,
  incidencias,
  clavesVisibles,
  camposCorregidos,
  vehiculos,
  conductores,
  revisionRef,
  crearPending,
  onActualizarCampo,
  onCambiarVehiculo,
  onCambiarConductor,
  onConfirmar,
  onScrollToRevision,
  onCrear,
}: {
  estado: EstadoWizard;
  comparacion: ComparacionEmpresa;
  discrepanciaCif: boolean;
  incidencias: Incidencia[];
  clavesVisibles: string[];
  camposCorregidos: string[];
  vehiculos: Vehiculo[] | undefined;
  conductores: Conductor[] | undefined;
  revisionRef: RefObject<HTMLParagraphElement | null>;
  crearPending: boolean;
  onActualizarCampo: (clave: string, valor: string) => void;
  onCambiarVehiculo: (vehiculo: string) => void;
  onCambiarConductor: (conductor: string) => void;
  onConfirmar: (confirmado: boolean) => void;
  onScrollToRevision: () => void;
  onCrear: () => void;
}) {
  const campos = estado.campos;
  void camposCorregidos; // usado por el padre para el payload; conservado por simetría

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
          {estado.estado}
        </span>
        {estado.avisos.map((a, i) => (
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
              <dd className="font-medium">{comparacion.cifEmpresa || "Pendiente de confirmar"}</dd>
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
            <Button type="button" variant="outline" size="sm" onClick={onScrollToRevision}>
              Revisar información
            </Button>
            <Button type="button" size="sm" onClick={() => onConfirmar(true)}>
              Continuar de todos modos
            </Button>
          </div>
          {estado.confirmado && (
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
                    (clave === "requiere_identificacion_conductor" ? "Pendiente de confirmar" : "")
                  }
                  onValueChange={(v) => onActualizarCampo(clave, v)}
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
                <Input value={valor} onChange={(e) => onActualizarCampo(clave, e.target.value)} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Vehículo</Label>
          <Select value={estado.vehiculo} onValueChange={onCambiarVehiculo}>
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
          <Select value={estado.conductor} onValueChange={onCambiarConductor}>
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
          <p className="text-sm font-semibold text-accent">Comprobaciones previas a la creación</p>
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

      <Button onClick={onCrear} disabled={crearPending || (discrepanciaCif && !estado.confirmado)}>
        {crearPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear expediente con esta información
      </Button>
      {discrepanciaCif && !estado.confirmado && (
        <p className="text-xs text-muted-foreground">
          Confirma la discrepancia de CIF con «Continuar de todos modos» para poder crear el
          expediente.
        </p>
      )}
    </div>
  );
}

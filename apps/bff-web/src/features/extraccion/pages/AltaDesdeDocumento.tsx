import { useReducer, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  procesarDocumento,
  crearExpedienteDesdeExtraccion,
  subirDocumentoEntrada,
  rutaEntrada,
  crearRegistroExtraccion,
} from "@/features/extraccion";
import { useVehiculos, useConductores } from "@/features/flota";
import { useSesion } from "@/hooks/use-org";
import { ETIQUETAS_CAMPO, ORDEN_CAMPOS, esCampoCritico } from "@/lib/analisis";
import { compararEmpresa, validarAntesDeCrear } from "@/lib/validacion-extraccion";
import { CabeceraWizard, PasoDocumento } from "../components/PasoDocumento";
import { PasoRevision } from "../components/PasoRevision";
import {
  estadoInicial,
  pasoDesdeFase,
  wizardReducer,
  type Sugerencias,
} from "../model/wizardReducer";
import type { Campos } from "../model/campos";

/**
 * Wizard de alta de expediente desde documento. Antes era
 * `components/alta-documento.tsx` (617 líneas, 14 useState). Ahora el estado
 * vive en un `useReducer` (model/wizardReducer.ts) y los pasos en componentes
 * separados. La UI es idéntica. Ver docs/refactor/PLAN-REFACTOR-FRONTEND.md §3.3.
 */
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
  const revisionRef = useRef<HTMLParagraphElement>(null);
  const fnProcesar = useServerFn(procesarDocumento);
  const fnCrear = useServerFn(crearExpedienteDesdeExtraccion);

  const [estado, dispatch] = useReducer(wizardReducer, estadoInicial("Notificación de la sanción"));
  const paso = pasoDesdeFase(estado.fase);

  const procesar = useMutation({
    mutationFn: async () => {
      if (!estado.archivo) throw new Error("Selecciona un documento (PDF, JPG o PNG)");
      if (!orgId || !userId) throw new Error("Tu usuario no tiene una empresa activa asignada");
      const archivo = estado.archivo;
      dispatch({ type: "INICIAR_PROCESADO" });

      const ruta = rutaEntrada(orgId, archivo.name);
      await subirDocumentoEntrada(ruta, archivo);

      const extraccionId = await crearRegistroExtraccion({
        organization_id: orgId,
        file_name: archivo.name,
        file_path: ruta,
        mime_type: archivo.type || "application/pdf",
        created_by: userId,
      });

      dispatch({ type: "REGISTRAR_EXTRACCION", extractionId: extraccionId });
      try {
        const resultado = await fnProcesar({ data: { extractionId: extraccionId } });
        return { ok: true as const, resultado };
      } catch (e) {
        console.error("[alta-documento] procesamiento no disponible", e);
        return { ok: false as const, motivo: (e as Error).message };
      }
    },
    onSuccess: (salida) => {
      if (!salida.ok) {
        dispatch({
          type: "PROCESADO_PENDIENTE",
          estado: "Documento subido correctamente. Pendiente de procesamiento.",
        });
        toast.success("Documento subido correctamente. Pendiente de procesamiento.");
        return;
      }
      const resultado = salida.resultado;
      const sugerencias: Sugerencias = resultado.sugerencias ?? {
        vehicleId: null,
        vehiculoTexto: null,
        driverId: null,
        conductorTexto: null,
      };
      dispatch({
        type: "PROCESADO_OK",
        campos: resultado.campos as Campos,
        avisos: resultado.avisos ?? [],
        estado: resultado.estado,
        sugerencias,
      });
      toast.success(resultado.estado);
    },
    onError: (e: Error) => {
      dispatch({ type: "PROCESADO_ERROR", estado: "No se ha podido subir el documento" });
      toast.error(e.message);
    },
  });

  // `estado.archivo` se lee vía closure en mutationFn; helper para acortar.
  const comparacion = compararEmpresa(empresa, {
    razonSocial:
      estado.campos["razon_social"]?.valor == null
        ? null
        : String(estado.campos["razon_social"].valor),
    cif: estado.campos["cif_nif"]?.valor == null ? null : String(estado.campos["cif_nif"].valor),
  });
  const discrepanciaCif = comparacion.cifComparable && !comparacion.cifCoincide;
  const incidencias = paso >= 2 ? validarAntesDeCrear(estado.campos, comparacion) : [];
  const camposCorregidos = Object.keys(estado.campos).filter(
    (c) =>
      String(estado.campos[c]?.valor ?? "") !== String(estado.camposOriginales[c]?.valor ?? ""),
  );
  const clavesVisibles = ORDEN_CAMPOS.filter(
    (c) => estado.campos[c] !== undefined || esCampoCritico(c),
  );

  const crear = useMutation({
    mutationFn: async () => {
      if (!estado.extractionId) throw new Error("Procesa antes el documento");
      if (discrepanciaCif && !estado.confirmado) {
        throw new Error("Confirma la discrepancia de CIF antes de crear el expediente");
      }
      return fnCrear({
        data: {
          extractionId: estado.extractionId,
          campos: estado.campos as never,
          vehicleId: estado.vehiculo === "__ninguno__" ? null : estado.vehiculo,
          driverId: estado.conductor === "__ninguno__" ? null : estado.conductor,
          documentType: estado.tipoDoc,
          discrepancias: incidencias.map((i) => i.mensaje),
          confirmadoPorUsuario: estado.confirmado,
          camposCorregidos: camposCorregidos.map((c) => ETIQUETAS_CAMPO[c] ?? c),
        },
      });
    },
    onSuccess: ({ sanctionId }) => {
      dispatch({ type: "CREADO" });
      toast.success("Expediente creado");
      navigate({ to: "/sanciones/$id", params: { id: sanctionId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card-surface p-5">
      <CabeceraWizard paso={paso} />

      {paso < 2 && (
        <PasoDocumento
          estado={estado}
          procesando={procesar.isPending}
          onElegirArchivo={(f) => f && dispatch({ type: "ELEGIR_ARCHIVO", archivo: f })}
          onQuitarArchivo={() => dispatch({ type: "QUITAR_ARCHIVO" })}
          onCambiarTipoDoc={(tipoDoc) => dispatch({ type: "CAMBIAR_TIPO_DOC", tipoDoc })}
          onProcesar={() => procesar.mutate()}
        />
      )}

      {paso >= 2 && (
        <PasoRevision
          estado={estado}
          comparacion={comparacion}
          discrepanciaCif={discrepanciaCif}
          incidencias={incidencias}
          clavesVisibles={clavesVisibles}
          camposCorregidos={camposCorregidos}
          vehiculos={vehiculos}
          conductores={conductores}
          revisionRef={revisionRef}
          crearPending={crear.isPending}
          onActualizarCampo={(clave, valor) => dispatch({ type: "ACTUALIZAR_CAMPO", clave, valor })}
          onCambiarVehiculo={(vehiculo) => dispatch({ type: "CAMBIAR_VEHICULO", vehiculo })}
          onCambiarConductor={(conductor) => dispatch({ type: "CAMBIAR_CONDUCTOR", conductor })}
          onConfirmar={(confirmado) => dispatch({ type: "CONFIRMAR_DISCREPANCIA", confirmado })}
          onScrollToRevision={() => {
            dispatch({ type: "CONFIRMAR_DISCREPANCIA", confirmado: false });
            revisionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onCrear={() => crear.mutate()}
        />
      )}
    </div>
  );
}

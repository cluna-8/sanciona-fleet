export type Plan = {
  id: string;
  nombre: string;
  precio: string;
  periodo: string;
  descripcion: string;
  destacado?: boolean;
  incluye: string[];
};

export const PLANES: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio: "49 €",
    periodo: "al mes",
    descripcion: "Para flotas pequeñas que empiezan a ordenar sus sanciones.",
    incluye: [
      "Hasta 10 vehículos y 15 conductores",
      "Sanciones ilimitadas",
      "Lectura automática de documentos",
      "Calendario de plazos y avisos",
      "2 usuarios",
    ],
  },
  {
    id: "pro",
    nombre: "Profesional",
    precio: "99 €",
    periodo: "al mes",
    destacado: true,
    descripcion: "La opción más elegida por empresas de transporte en activo.",
    incluye: [
      "Hasta 50 vehículos y 80 conductores",
      "Análisis jurídico asistido",
      "Generación de alegaciones y recursos",
      "Informes de ahorro y actividad",
      "10 usuarios y roles",
    ],
  },
  {
    id: "empresa",
    nombre: "Empresa",
    precio: "199 €",
    periodo: "al mes",
    descripcion: "Para grandes flotas con varios centros de trabajo.",
    incluye: [
      "Vehículos y conductores ilimitados",
      "Usuarios ilimitados",
      "Integraciones y soporte prioritario",
      "Acompañamiento en la puesta en marcha",
      "Informes a medida",
    ],
  },
];

export function planPorId(id: string) {
  return PLANES.find((p) => p.id === id);
}

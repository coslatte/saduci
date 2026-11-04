export const RECORD_HISTORY_COPY = {
  predictions: {
    title: "Historial de predicciones guardadas",
    loadError: "No se pudo cargar el historial de predicciones.",
    empty: "Aún no hay predicciones guardadas.",
  },
  simulations: {
    title: "Historial de simulaciones guardadas",
    loadError: "No se pudo cargar el historial de simulaciones.",
    empty: "Aún no hay simulaciones guardadas.",
  },
  retry: "Recargar historial",
} as const;

export const RECORD_WORKSPACE_COPY = {
  workspace: "Área de trabajo clínico",
  archive: "Archivo clínico",
  navigation: "Tipos de historial",
  search: "Buscar en el historial",
  placeholder: "Paciente, resultado o profesional…",
  emptySearch: "No hay registros que coincidan con la búsqueda.",
  clear: "Limpiar búsqueda",
  results: "Resultados",
  ready:
    "Configure el paciente y ejecute la simulación para consultar aquí los resultados.",
  all: "Ver historial completo",
  tabs: [
    { href: "/records/predictions", label: "Predicciones" },
    { href: "/records/simulations", label: "Simulaciones" },
    { href: "/records/statistics", label: "Pruebas estadísticas" },
  ],
} as const;

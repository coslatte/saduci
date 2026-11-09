export const PREDICTION_WORKFLOW_COPY = {
  changedInputs:
    "El formulario cambió después de la última predicción. La explicación usa los datos que generaron el resultado mostrado.",
  missingStoredInputs:
    "Este registro no conserva todas las variables necesarias para generar una explicación.",
  missingModelProvenance:
    "Este registro no conserva la versión y el checksum del modelo. No se puede verificar que una explicación corresponda al resultado.",
  activeModelChanged:
    "La versión activa del modelo no coincide con la que generó este registro. No se mostró una explicación.",
  activeModelChangedForCurrentResult:
    "La versión activa del modelo cambió desde la predicción. Ejecute otra predicción antes de solicitar la explicación.",
  notPersisted:
    "La probabilidad está disponible, pero no se guardó el registro. Verifique la conexión y vuelva a guardar antes de usar el historial.",
} as const;

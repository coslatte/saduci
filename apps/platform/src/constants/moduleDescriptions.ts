export const MODULE_DESCRIPTIONS = {
  simulation: {
    summary:
      "Simula la evolución de un paciente en cuidados intensivos a partir de sus datos clínicos.",
    detail:
      "Introduce las características del paciente, sus diagnósticos, el puntaje APACHE II y los tiempos asociados a la atención y la ventilación. La simulación realiza varias corridas y presenta estimaciones de las etapas de atención, junto con sus medidas de variación y una predicción del modelo. Puedes revisar los resultados de cada ejecución y consultar las simulaciones guardadas en el historial de este módulo.",
  },
  prediction: {
    summary:
      "Estima la probabilidad de fallecimiento a partir de los datos clínicos del paciente.",
    detail:
      "La predicción utiliza la edad, los diagnósticos de ingreso y egreso, el puntaje APACHE II y el tiempo de ventilación asistida. El resultado presenta una probabilidad y una clasificación del modelo; las herramientas de explicación permiten explorar la contribución de las variables. Las predicciones guardadas pueden consultarse en el historial del módulo. El resultado puede ayudar al personal clínico durante la valoración del paciente.",
  },
  statistics: {
    summary:
      "Compara datos de experimentos mediante pruebas estadísticas no paramétricas.",
    detail:
      "Carga archivos CSV y selecciona la columna numérica que deseas analizar. La prueba de Wilcoxon compara dos muestras relacionadas; la prueba de Friedman permite comparar tres o más muestras relacionadas. La aplicación muestra el estadístico y el valor p obtenidos y avisa cuando ajusta el tamaño de las muestras. Los resultados registrados también pueden consultarse en el historial de este módulo.",
  },
} as const;

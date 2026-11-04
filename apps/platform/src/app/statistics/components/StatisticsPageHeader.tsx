/**
 * Renders title and subtitle for the statistics module landing section.
 * Used in X case: top heading area on statistics page.
 */
export function StatisticsPageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-(length:--font-size-2xl) font-bold tracking-tight text-slate-900 md:text-(length:--font-size-3xl)">
        Pruebas Estadísticas
      </h1>
      <p className="mt-2 text-(length:--font-size-sm) text-slate-500">
        Ejecute pruebas estadísticas no paramétricas sobre los datos de
        experimentos de pacientes UCI.
      </p>
    </div>
  );
}

# Registro del modelo predictivo

## new_workflow.joblib

- Versión de integración: `v1`.
- Artefacto y manifiesto: `new_workflow.joblib` y `manifest.json`, en esta carpeta.
- Origen: `acferriol/Intensive-Care-Hidden-Mortality`, commit
  `2cf81403b3ce9390618df3cd2e7a43082506c5c3`.
- SHA-256: `b58bcf14ff4ad023c608861323bcabca5fa5d9250058af9f1ed1d0e1cf1923ad`.
- Pipeline verificado con scikit-learn `1.6.1`: `ColumnTransformer` y `MLPClassifier`.
- Entradas, en orden: `Edad`, `Diag.Ing1`, `Diag.Ing2`, `Diag.Egr2`, `APACHE`, `TiempoVAM`.
- Clases del artefacto: `0` y `1`; la integración existente utiliza `1` para mortalidad.

El commit identifica una copia comprobada del artefacto en el repositorio de
origen. No identifica por sí solo la ejecución de entrenamiento, sus particiones
o una validación clínica. `v1` es la versión de integración en SADUCI.

El cargador comprueba el manifiesto, el checksum, las variables y las clases.
Si se configura `PREDICTION_MODEL_PATH`, esa ruta es obligatoria y requiere un
`manifest.json` junto al archivo. Un fallo deja el servicio no disponible; no
selecciona otro artefacto silenciosamente. El manifiesto verifica integridad y
compatibilidad, no certifica la procedencia de un paquete ajeno.

Las respuestas nuevas de predicción y explicación incluyen `model_version` y
`artifact_sha256`. Los registros nuevos conservan esos campos en su JSON
`prediction`, sin migrar ni atribuir una versión a resultados históricos.

`tests/prediction/test_model_integration.py` contiene cinco casos sintéticos
ejecutados contra el artefacto original. Compara la probabilidad sin redondear con
tolerancia absoluta de `1e-10` y verifica la respuesta de ambos alias HTTP con el
redondeo existente de cuatro decimales. No son datos de pacientes ni métricas de
calidad clínica.

Permanecen abiertas la unidad de ventilación, el dominio evaluado, la definición
temporal del desenlace y la correspondencia de los explicadores históricos.
Esta entrega conserva las conversiones y los rangos anteriores.

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

## Evidencia para las explicaciones con modelos de lenguaje

El servicio calcula una probabilidad original y seis contrastes, sustituyendo una
variable por vez y ejecutando el pipeline completo. Las seis entradas clínicas
se transforman en 93 entradas para el MLP, cuyas capas ocultas son
`200, 150, 100, 50` con activación ReLU. No se explica una red alternativa.

`PlatformExplanationEvidence` reúne el resultado, las referencias, la probabilidad
de cada sustitución, los cambios y la procedencia del artefacto. La respuesta HTTP,
el gráfico y el prompt se construyen con esa evidencia. Los prompts incluyen las
seis variables y las descripciones de las categorías observadas y de referencia.

El método disponible es `Impacto local por referencia`, con versión
`reference-impact-v1` y estrategia `schema-midpoint-v1`. Las referencias actuales
son puntos medios del esquema: no representan normalidad ni una población clínica
validada. Esa limitación se devuelve a la interfaz y al generador de texto.

El repositorio investigativo conserva otras generaciones de explicadores:

- El pickle `Explainers/ig_explainer.pkl` contiene una red con entrada de tamaño
  6 y activaciones Tanh. `Classification.ipynb`, celdas JSON 77, 94 y 96,
  describe la transferencia de una red anterior, su explicación y su guardado.
  No se incorpora ese objeto al pipeline actual sin probar equivalencia.
- `llms/model-explain-text.ipynb`, celda JSON 9, construye SHAP sobre
  `model.predict`. Explica etiquetas, no directamente la probabilidad que muestra
  SADUCI. La idea de transformar valores y contribuciones en texto se conserva;
  sus atribuciones necesitan una implementación nueva sobre la salida pertinente.

Los índices de celdas comienzan en cero. La inspección del pickle se hizo con
`pickletools`, sin ejecutarlo ni deserializar redes PyTorch. Los demás explicadores
guardados permanecen pendientes de verificar contra este artefacto.

Los proveedores `embedded`, `local`, `gemini` y `huggingface` reciben los mismos
hechos y restricciones. Si fallan o devuelven texto vacío, el servicio conserva
la evidencia y usa una plantilla identificada. Los estados de narrativa son
`disabled`, `generated`, `template` y `fallback`. Esto no verifica que un texto
generado por un LLM sea clínicamente correcto; requiere revisión independiente.

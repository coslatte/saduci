# Estudio de viabilidad del modelo local de explicaciones

Fecha: 6 de noviembre de 2026.

## Alcance y conclusión

Se estudia el uso de Qwen2.5-1.5B-Instruct Q4_K_M para redactar explicaciones
de predicciones de SADUCI en un equipo anfitrión con un Intel Core i3 de cuatro
núcleos y 8 GB de RAM, con tres usuarios solicitando predicciones y explicaciones.

El modelo es un candidato para una prueba piloto, pero **todavía no se puede
garantizar que tres usuarios reciban explicaciones de IA dentro del tiempo
permitido**. Este estudio se basa en el código y referencias externas: el modelo
no se descargó ni se ejecutó en el equipo objetivo. No hay mediciones locales de
latencia, consumo de memoria, rendimiento bajo carga ni calidad clínica.

## Recursos y flujo de ejecución

- El archivo Q4_K_M ocupa aproximadamente 1,12 GB según la [distribución oficial](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF). El motor, el contexto, el sistema operativo y los demás servicios requieren memoria adicional; el tamaño del archivo no es el consumo total de RAM.
- El modelo predictivo `joblib` calcula la probabilidad. Para explicar una predicción, el servicio calcula la probabilidad de nuevo y compara seis variables con valores de referencia: ocho llamadas a `predict_proba` por solicitud de explicación. Después solicita la narrativa al modelo de lenguaje. Véanse [`inference.py`](../../apps/core/src/prediction/app/services/inference.py) y [`prediction_service.py`](../../apps/core/src/prediction/app/services/prediction_service.py).
- La configuración actual utiliza una instancia del modelo de lenguaje, un contexto de 2.048 tokens, cuatro hilos y un máximo de 120 tokens de salida. Un bloqueo permite una sola generación a la vez, por lo que las solicitudes concurrentes esperan su turno. Véase [`narrative_model.py`](../../apps/core/src/prediction/app/services/narrative_model.py).
- El frontend cancela la solicitud de explicación después de 30 segundos; el cliente del gateway también tiene un límite de 30 segundos. Véanse [`route.ts`](../../apps/platform/src/app/api/prediction/explain/route.ts) y [`config.py`](../../apps/core/src/api-gateway/app/controllers/config.py).

Los cuatro hilos de inferencia compiten por CPU con el resto del sistema. Los
8 GB de RAM se comparten con los servicios, las bases de datos y el sistema
operativo. Sin el modelo instalado se presenta un resumen de respaldo; eso no
equivale a comprobar la generación con IA.

## Tres solicitudes simultáneas

Si cada generación tarda `T` y las tres solicitudes llegan juntas, sin trabajo
previo en espera y con tiempos iguales, las respuestas llegarían aproximadamente
en `T`, `2T` y `3T`. Los siguientes valores son **ejemplos matemáticos, no
mediciones ni estimaciones de la velocidad del equipo**:

| Tiempo supuesto por explicación | Primer usuario | Segundo usuario | Tercer usuario |
|---:|---:|---:|---:|
| 6 s | 6 s | 12 s | 18 s |
| 10 s | 10 s | 20 s | 30 s: al límite |
| 15 s | 15 s | 30 s: al límite | 45 s: excede el límite |

El cálculo predictivo, la red y otros gastos se suman a esos tiempos. Para que
la tercera solicitud tenga margen frente al límite actual, la generación tendría
que tardar claramente menos de 10 segundos. Todavía no se ha demostrado esa
condición. Aumentar el límite de espera no aumenta la velocidad de generación.

Una [medición externa de llama.cpp en CPU](https://github.com/quanhua92/local-llm-lab/blob/main/reports/cpu.md) informó aproximadamente 30 tokens por segundo para Qwen2.5-1.5B Q4_K_M en un i7-10700 de ocho núcleos, 64 GB de RAM y ocho hilos. Esa máquina y configuración son distintas: el resultado **no predice** la velocidad del i3. La duración total también incluye procesar el texto de entrada.

## Calidad y límites de interpretación

Qwen es un modelo general que puede redactar en español. No se ha comprobado que
reproduzca fielmente las cifras y direcciones del predictor para estos casos:
podría alterar números, invertir una dirección o introducir afirmaciones sin
respaldo. Las explicaciones requieren evaluación con casos y revisión humana.

El gráfico describe cambios en la salida del predictor al sustituir una
variable por un valor de referencia; no establece causas médicas. En diagnósticos,
el punto medio de códigos numéricos corresponde a una categoría concreta y no
necesariamente a una referencia clínica representativa. La [guía de la OMS sobre modelos generativos en salud](https://www.who.int/publications-detail-redirect/9789240084759) describe consideraciones para su evaluación y uso.

## Plan de evaluación futura

1. Registrar el modelo y generación exactos del i3, el sistema operativo, la RAM disponible y las versiones de software. Mantener en marcha los servicios y bases de datos que se utilizarán normalmente.
2. Medir por separado predicción y explicación con un usuario y con tres usuarios simultáneos; repetir las rondas e incluir solicitudes sucesivas. Registrar el tamaño de los textos de entrada y salida y si el modelo ya estaba cargado.
3. Registrar la latencia por usuario, incluyendo espera; errores y tiempos límite; uso máximo de CPU y RAM; y cuántas respuestas utilizaron el modelo local frente al resumen de respaldo.
4. Revisar una muestra de explicaciones en español contra los datos originales: probabilidad, umbral, dirección y magnitud de cada cambio, además de afirmaciones no sustentadas. Documentar los casos y los criterios de aceptación antes de evaluar la muestra.
5. Si las solicitudes superan frecuentemente el límite, evaluar una cola visible y ejecución en segundo plano, junto con los tiempos límite de todas las capas. Repetir las mediciones tras cualquier cambio y acordar tiempos de respuesta aceptables con los usuarios.

Los pasos para descargar el modelo cuando haya ancho de banda están en [RUNNING.md](RUNNING.md#modelo-local-para-explicar-predicciones).

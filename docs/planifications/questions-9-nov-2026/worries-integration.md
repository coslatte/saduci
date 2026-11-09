# Preguntas abiertas para integrar el módulo de mortalidad en SADUCI

Fecha: 9 de noviembre de 2026.

La decisión actual es consolidar primero el modelo existente y abordar después
la detección temprana. El módulo debe ofrecer al personal médico una probabilidad
estimada, una explicación de las variables y una narrativa comprensible, mediante
un modelo de lenguaje local o un servicio gratuito en la nube si su uso está
autorizado.

El predictor calcula el riesgo. El mecanismo de explicación describe el
comportamiento del predictor y el modelo de lenguaje redacta esa información.
La narrativa debe conservar cifras y limitaciones, sin inventar causas ni añadir
recomendaciones clínicas que los resultados no sustentan.

Las preguntas siguientes permanecen pendientes de respuesta. Su orden indica
la prioridad para orientar la integración.

## 1. Qué significa mortalidad oculta post

¿Se trata de muerte después del egreso de UCI, durante la hospitalización o de
otro desenlace? ¿En qué plazo se observa?

La respuesta determina qué puede afirmar el módulo y cómo verificar sus
resultados. El uso de un diagnóstico de egreso como entrada no demuestra que
el desenlace predicho ocurra después del egreso.

## 2. Qué representa la variable Fallece

¿Qué significa exactamente `Fallece` en los datos originales? ¿Dónde está
documentada su definición, cómo se codifica y cuándo se registra el desenlace?

Esto permite comprobar si el objetivo usado para entrenar el modelo corresponde
al concepto de mortalidad oculta que se quiere estudiar.

## 3. Cuándo utiliza el módulo el médico

¿En qué momento introduce los datos y solicita la predicción? ¿Están disponibles
en ese instante todas las variables, incluido el diagnóstico de egreso?

La respuesta delimita el uso del modelo actual y evita presentar como alerta
temprana una evaluación que requiere información posterior.

## 4. Cómo recuperar la definición de los datos y del modelo

¿Podemos consultar al autor del modelo o recuperar el diccionario de datos?
¿Qué documentación o responsable puede confirmar las unidades de ventilación,
los códigos diagnósticos, la población estudiada y la procedencia del entrenamiento?

Esto permite resolver las diferencias entre el prototipo y SADUCI antes de
modificar límites, conversiones o catálogos.

## 5. Qué necesita leer el médico en la explicación

¿Basta con mostrar el riesgo, las variables relevantes y las limitaciones?
¿Se necesitan también comparaciones con valores de referencia? ¿Qué preguntas
concretas espera poder responder el médico con esa información?

La respuesta define el contenido de la explicación numérica y de la narrativa,
así como sus límites dentro de una herramienta de ayuda a la decisión clínica.

## 6. Dónde se ejecutará SADUCI y con cuántos usuarios

¿Qué equipo ejecutará SADUCI y el modelo de lenguaje local? ¿Cuánta CPU y RAM
estarán disponibles? ¿Cuántos médicos solicitarán explicaciones simultáneamente
y cuánto tiempo de espera resulta aceptable?

Esto permite evaluar la generación local en condiciones representativas y
decidir si hace falta otra modalidad de ejecución.

## 7. Si está permitido usar un proveedor externo

¿Está permitido enviar variables clínicas a un proveedor de nube? ¿Qué datos
podrían transmitirse y quién autoriza ese uso?

La gratuidad del acceso no resuelve esta decisión. La respuesta determina si
una alternativa en la nube puede formar parte del módulo.

## 8. Quién revisará las explicaciones y cómo se aceptarán

¿Qué profesionales revisarán las explicaciones? ¿Qué criterios usarán para
considerarlas claras, fieles al resultado y útiles? ¿Qué errores impedirían
habilitar el módulo?

Los criterios deben establecerse antes de evaluar la muestra de explicaciones.
La revisión debe comprobar cifras, dirección de los cambios, afirmaciones sin
sustento y comprensión de las limitaciones.

## Continuación propuesta

Resolver primero la definición del desenlace y la procedencia de los datos con
el autor o responsable del modelo. En paralelo, verificar el recorrido técnico
del modelo actual en SADUCI, desde la entrada hasta el guardado y la consulta del
resultado. Esa verificación no necesita esperar a la elección definitiva del
generador de texto.

El [estudio y plan de integración](../../sistema/INTEGRATION_PLAN_2026.md)
contiene las brechas técnicas, las entregas propuestas y sus criterios de aceptación.

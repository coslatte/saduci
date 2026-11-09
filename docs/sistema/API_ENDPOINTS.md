# API Endpoints - SADUCI

Base URL (desarrollo): `http://localhost:7000` (API Gateway). Todos los endpoints
de dominio se consumen a través del gateway; los servicios internos (7001-7004)
no se exponen públicamente.

## API Gateway (Puerto principal)

### Health
- `GET /health` - Health check
- `GET /api/admin/services/health` - Estado de salud y latencia de los cuatro microservicios internos (solo ADMIN). La respuesta conserva el estado de cada servicio y añade `latency_ms` con la duración de cada comprobación.

### Autenticación
- `POST /auth/login` - Inicio de sesión (rate-limited: 5 intentos/60s)
- `POST /auth/register` - Registro público de usuario (rol MEDICO)
- `GET /auth/me` - Obtener usuario actual (JWT)
- `POST /auth/change-password` - Cambiar contraseña (JWT)
- `PUT /api/user/profile` - Actualizar perfil propio (JWT)

### Gestión de Usuarios
- `POST /api/users` - Crear usuario (JWT)
- `GET /api/users` - Listar usuarios con filtro `?role=` (JWT)
- `GET /api/users/{user_id}` - Obtener usuario (JWT)
- `PUT /api/users/{user_id}` - Actualizar usuario (JWT)
- `DELETE /api/users/{user_id}` - Eliminar usuario (JWT)
- `GET /admin/users` - Listar todos los usuarios (JWT)
- `POST /admin/users` - Crear usuario (JWT)
- `PUT /admin/users/{user_id}` - Actualizar `username`, `email`, `role` y/o `is_active` (JWT)
- `DELETE /admin/users/{user_id}` - Eliminar usuario, sin autoborrado (JWT)

### Pacientes
- `POST /api/patients` - Crear paciente (JWT)
- `POST /api/patients/next-sku` - Reservar el siguiente SKU secuencial de paciente (JWT); responde `{ "sku": "PRED-000001" }`.
- `GET /api/patients/{mrn}` - Obtener paciente (JWT)
- `PUT /api/patients/{mrn}` - Actualizar paciente (JWT)

### Diagnósticos
- `GET /api/diagnoses` - Catálogo ordenado por código, con `id` y `name` (JWT). El código 0 representa un diagnóstico vacío.

### Predicciones
- `POST /api/predictions` - Crear predicción (JWT)
- `GET /api/predictions` - Listar predicciones (JWT)
- `GET /api/predictions/count` - Total de predicciones (JWT)
- `GET /api/predictions/models` - Listar modelos disponibles (JWT)
- `GET /api/predictions/{patient_id}` - Historial por paciente (JWT)
- `PUT /api/predictions/{prediction_id}` - Actualizar únicamente `created_at` (JWT)
- `POST /prediction` - Predicción de plataforma (público)
- `POST /prediction/explain` - Explicación de predicción (público)
- `POST /prediccion` - Alias español de `/prediction` (público)
- `POST /prediccion/explain` - Alias español de `/prediction/explain` (público)

### Simulaciones
- `POST /api/simulations` - Crear simulación (JWT)
- `GET /api/simulations` - Listar simulaciones (JWT)
- `GET /api/simulations/count` - Total de simulaciones (JWT)
- `GET /api/simulations/scenarios` - Listar escenarios (JWT)
- `GET /api/simulations/{patient_id}` - Historial por paciente (JWT)
- `PUT /api/simulations/{simulation_id}` - Actualizar únicamente `created_at` (JWT)
- `POST /api/simulations/icu` - Simulación de paciente UCI (JWT)
- `POST /simulation` - Simulación de plataforma (público). `n_runs` es opcional y su valor por defecto es 5000.

### Estadísticas
- `POST /statistics/wilcoxon` - Test de Wilcoxon (público)
- `POST /statistics/friedman` - Test de Friedman (público)
- `GET /api/statistical-tests` - Listar resultados persistidos (JWT)
- `POST /api/statistical-tests` - Crear resultado (JWT)
- `PUT /api/statistical-tests/{test_id}` - Actualizar resultado (JWT)

### Tiempo real
- `WS /ws/events` - Eventos en vivo
- `POST /api/internal/event` - Broadcast interno

---

## Platform BFF (Next.js)

Rutas internas `apps/platform/src/app/api/*`: el navegador solo habla con
el BFF y este reenvía al API Gateway.

- `GET /api/health` - Sondeo de disponibilidad del backend
  (`{ reachable: true }`, o `{ reachable: false }` con 502). Timeout corto
  (2s); lo usa la política de reintento incremental del login.
- `GET /api/admin/services/health` - Proxy de diagnóstico de servicios (solo ADMIN).
- `GET /api/simulations/[id]` - Detalle de simulación por id (JWT). El
  gateway no expone get-by-id, así que el BFF lista y resuelve el registro
  en servidor, devolviendo 404 si no existe.
- `GET /api/predictions/[id]` - Detalle de predicción por id (JWT). Igual
  que el anterior, sobre el listado de predicciones.

## Prediction Service (:7003)

- `GET /health`
- `POST /prediction`, `POST /prediccion`, `POST /prediction/explain`, `POST /prediccion/explain`
- `POST /predictions` (histórico/legacy)
- `GET /api/predictions`, `GET /api/predictions/count`, `GET /api/predictions/models`
- `GET /api/predictions/{patient_id}`, `PUT /api/predictions/{id}`

### Procedencia del predictor

Las respuestas de `POST /prediction`, `/prediccion` y sus rutas `/explain`
incluyen `model_version` y `artifact_sha256`, correspondientes al artefacto
validado y cargado. El BFF y el gateway conservan esos campos; el cliente de
plataforma exige una versión no vacía y un SHA-256 válido. Backend y frontend
deben actualizarse juntos.

Los registros nuevos de plataforma guardan ambos campos dentro de `prediction`.
En el contrato histórico `POST /api/predictions` se incluyen dentro del objeto
`prediction`, junto a `risk_score` y `risk_level`. Los registros anteriores no
se modifican ni reciben procedencia supuesta.

El servicio requiere `manifest.json` junto al artefacto. Una ruta explícita en
`PREDICTION_MODEL_PATH` que falta o no supera la validación no se sustituye por
otro modelo; `/health` y las operaciones predictivas responden 503. Una salida
numérica no finita o fuera de `[0,1]` produce un error de inferencia, sin recorte.

La procedencia de una explicación identifica el modelo usado para ese cálculo.
Todavía no vincula la explicación al ID de una predicción histórica ni garantiza
que use su versión original tras un cambio de artefacto.

### Evidencia numérica y narrativa

`POST /prediction/explain` y su alias aceptan únicamente
`method: "Impacto local por referencia"`; ese es también el valor por defecto.
LIME, SHAP, Gradientes Integrados y Mapas de Saliencia responden 422 mientras no
tengan una implementación verificada. La interfaz solo ofrece el método efectivo.

La respuesta añade `explainer_version`, `reference_strategy` y
`reference_warning`. Cada fila de `rows` contiene `baseline_value_display` y
`baseline_probability`, además del valor observado, referencia numérica,
contribución y dirección. La contribución es la probabilidad original menos la
probabilidad al sustituir esa variable, con el redondeo documentado. Los contrastes
no tienen por qué sumar la probabilidad ni representar causas clínicas.

La estrategia actual `schema-midpoint-v1` utiliza puntos medios de los límites
del esquema, con códigos válidos en los campos actuales. No constituye una
referencia clínica validada. El aviso acompaña los datos, aparece en el panel y
se incluye en el prompt. Las unidades de ventilación siguen pendientes de confirmar.

El generador recibe una `PlatformExplanationEvidence` con las seis variables,
sus categorías legibles, resultados de sustitución, método, umbral y procedencia.
No recibe el identificador del paciente. Todos los proveedores comparten las
restricciones de interpretación del predictor.

`narrative_status` distingue estos resultados:

| Estado | Significado |
| --- | --- |
| `disabled` | No se solicitó narrativa. |
| `generated` | El proveedor devolvió texto no vacío; no implica validación clínica del texto. |
| `template` | Se pidió explícitamente el proveedor de plantilla `stub`. |
| `fallback` | Falló el proveedor o devolvió texto vacío y se utilizó una plantilla. |

La indisponibilidad de un proveedor no elimina probabilidad ni filas calculadas.
En el fallback, `narrative_provider` es `stub` y `narrative_model` es
`template-reference-v2`. La UI distingue este caso de una generación con IA.

## Simulation Service (:7004)

- `GET /health`, `POST /simulation`
- `POST /api/simulations`, `GET /api/simulations`, `GET /api/simulations/count`
- `GET /api/simulations/scenarios`, `GET /api/simulations/{patient_id}`
- `PUT /api/simulations/{id}`, `POST /api/simulations/icu`
- `POST /statistics/wilcoxon`, `POST /statistics/friedman`
- `GET /api/statistical-tests`, `POST /api/statistical-tests`
- `PUT /api/statistical-tests/{id}`

## User Service (:7001)

- `GET /health`, `POST /auth/login`, `POST /auth/register`
- `POST /auth/change-password` (el gateway pasa `user_id` como query)
- `PUT /api/user/profile`
- `POST /api/users`, `GET /api/users`, `GET /api/users/{id}`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`
- `GET /admin/users`, `GET /admin/users/{id}`, `PUT /admin/users/{id}/role`

## Patient Service (:7002)

- `GET /health`, `POST /api/patients/next-sku`, `POST /api/patients`, `GET /api/patients/{mrn}`, `PUT /api/patients/{mrn}`

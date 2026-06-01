# SADUCI-Core Architecture (Iteracion 1 de 3)

Este documento describe el estado real del backend en el repositorio actual.
La arquitectura activa se concentra en tres piezas: API Gateway, Prediction Service y Simulation Service.

## 1) Vision General

SADUCI-Core es un backend de microservicios para inteligencia clinica en UCI con FastAPI.

1. API Gateway: autenticacion JWT y proxy hacia los servicios de dominio.
2. Prediction Service: predicciones clinicas y compatibilidad con la plataforma externa.
3. Simulation Service: simulacion clinica, SimUCI y endpoints estadisticos.

Cada servicio de dominio conserva su propia base PostgreSQL en Docker Compose.

## 2) Diagrama de Alto Nivel

```text
Clientes HTTP
    |
    v
API Gateway :8000
    |-- /api/predictions --------> Prediction Service :8002 ------> prediction-db (PostgreSQL)
    |-- /api/simulations* -------> Simulation Service :8003 ------> simulation-db (PostgreSQL)
    |
    |-- /prediction, /prediction/explain (proxy sin JWT para saduci-platform)
    |-- /simulation, /statistics/*   (proxy sin JWT para saduci-platform)
```

## 3) Componentes y Responsabilidades

### 3.1 API Gateway

Archivo principal: [src/api-gateway/main.py](../src/api-gateway/main.py)

Responsabilidades:

- autenticar usuarios con JWT
- proteger rutas internas con `Authorization: Bearer`
- reenviar llamadas a prediction y simulation
- exponer endpoints no autenticados para la plataforma externa

Rutas principales:

- `GET /health`
- `POST /auth/login`
- `POST /api/predictions`
- `GET /api/predictions/models`
- `GET /api/predictions/{patient_id}`
- `GET /api/simulations/scenarios`
- `GET /api/simulations/{patient_id}`
- `POST /api/simulations`
- `POST /api/simulations/icu`
- `POST /prediction`
- `POST /prediction/explain`
- `POST /simulation`
- `POST /statistics/wilcoxon`
- `POST /statistics/friedman`

### 3.2 Prediction Service

Archivo principal: [src/prediction/main.py](../src/prediction/main.py)

Responsabilidades:

- ejecutar compatibilidad de legados y el modelo entrenado versionado
- persistir historial de predicciones en PostgreSQL
- servir el formato compatible con la plataforma externa
- ejecutar inferencia real para saduci-platform con el modelo entrenado `src/prediction/models/v1/new_workflow.joblib`
- entregar datos estructurados para tabla/grafico (importancias por variable, valor observado, baseline y direccion)
- generar narrativa clinica opcional mediante proveedor configurable (stub o endpoint Hugging Face)

Modelos soportados:

1. `mortality_risk`
2. `length_of_stay`
3. `readmission_risk`

Notas:

- `POST /prediction` usa el pipeline entrenado (`imblearn.pipeline.Pipeline`) y devuelve probabilidad + clase binaria (`vive`/`muere`).
- `POST /prediction/explain` mantiene `feature_names`/`importances` y agrega `rows` con estructura lista para frontend.
- `POST /prediction/explain` puede incluir `narrative` si `include_narrative=true`.
- El proveedor de narrativa se configura con `PREDICTION_NARRATIVE_PROVIDER` (`stub`, `local`, `gemini` o `huggingface`).
- Para `local`, usar `PREDICTION_LOCAL_LLM_URL` apuntando a un endpoint LLM compatible con `chat/completions` y `PREDICTION_LOCAL_LLM_MODEL` para el identificador del modelo.
- Para `gemini`, usar `PREDICTION_GEMINI_API_KEY` y `PREDICTION_GEMINI_MODEL` (por defecto `gemini-2.5-flash`).
- `huggingface` se mantiene como opción de compatibilidad con `HUGGINGFACE_API_URL` y opcionalmente `HUGGINGFACE_API_TOKEN`.

### 3.3 Simulation Service

Archivo principal: [src/simulation/main.py](../src/simulation/main.py)

Responsabilidades:

- simular escenarios clinicos de referencia
- ejecutar SimUCI cuando la libreria esta disponible
- usar fallback estadistico determinista cuando SimUCI no esta disponible
- exponer pruebas estadisticas Wilcoxon y Friedman

Rutas principales:

- `GET /health`
- `GET /scenarios`
- `POST /simulations`
- `GET /simulations/{patient_id}`
- `POST /simulations/icu`
- `POST /simulation`
- `POST /statistics/wilcoxon`
- `POST /statistics/friedman`

Escenarios de simulacion base:

1. `treatment_response`
2. `vital_signs_projection`
3. `intervention_outcomes`

Integracion SimUCI:

- usa `simuci.Experiment`, `single_run` y `multiple_replication`
- requiere `src/simulation/data/centroids.csv`
- publica estadisticas de salida (`mean`, `std`, `min`, `max`, `median`)

## 4) Componentes Compartidos

### 4.1 Esquemas Pydantic

Ubicacion: `shared/schemas/`

- `health.py`
- `prediction.py`
- `simulation.py`
- `statistics.py`
- `user.py`

Uso:

- contratos de request/response
- validacion de tipos
- consistencia entre gateway y servicios

### 4.2 Utilidades

Ubicacion: `shared/utils/`

- `auth.py`: hash/verificacion de password + JWT
- `http_client.py`: cliente HTTP asincrono para proxys internos
- `logger.py`: logger estandar para servicios

## 5) Infraestructura y Ejecucion

### 5.1 Docker Compose

Archivo: `docker-compose.yml`

Servicios levantados:

- `api-gateway`
- `prediction` + `prediction-db`
- `simulation` + `simulation-db`

Puntos relevantes:

- `depends_on` con `condition: service_healthy`
- reinicio `unless-stopped`
- bases sin exposicion publica directa
- servicios internos expuestos solo en `127.0.0.1` del host excepto el gateway

### 5.2 Entorno

Variables criticas:

- `SECRET_KEY`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `PREDICTION_DB_PASSWORD`
- `SIMULATION_DB_PASSWORD`

Variables operativas:

- `CORS_ALLOW_ORIGINS`
- `CORS_ALLOW_CREDENTIALS`
- `PORT`
- `DATABASE_URL`
- `PREDICTION_MODEL_PATH` (opcional)
- `PREDICTION_THRESHOLD`
- `PREDICTION_NARRATIVE_PROVIDER`
- `PREDICTION_LOCAL_LLM_URL`
- `PREDICTION_LOCAL_LLM_MODEL`
- `PREDICTION_LOCAL_LLM_TOKEN`
- `PREDICTION_LOCAL_LLM_TIMEOUT_SECONDS`
- `PREDICTION_GEMINI_API_KEY`
- `PREDICTION_GEMINI_MODEL`
- `PREDICTION_GEMINI_TIMEOUT_SECONDS`
- `PREDICTION_NARRATIVE_MODEL`
- `HUGGINGFACE_API_URL`
- `HUGGINGFACE_API_TOKEN`
- `HUGGINGFACE_TIMEOUT_SECONDS`

## 6) Flujo de Datos

### 6.1 Login y autorizacion

1. Cliente envia credenciales a `POST /auth/login`.
2. Gateway valida usuario/password y genera JWT.
3. Cliente usa `Authorization: Bearer <token>` en rutas protegidas.

### 6.2 Prediccion clinica

1. Cliente llama `POST /api/predictions` o `POST /prediction`.
2. Gateway reenvia la solicitud al Prediction Service.
3. Prediction Service ejecuta inferencia con el pipeline entrenado para la ruta de plataforma.
4. Se devuelve probabilidad de no sobrevida, salida binaria y metadatos para renderizar UI.
5. Si el cliente llama `POST /prediction/explain`, el servicio calcula contribuciones por variable y puede anexar narrativa clinica.

### 6.3 Simulacion clinica y estadistica

1. Cliente llama `POST /api/simulations`, `POST /api/simulations/icu` o `POST /simulation`.
2. Simulation Service ejecuta el engine base o SimUCI.
3. Para estadistica, el cliente llama `POST /statistics/wilcoxon` o `POST /statistics/friedman`.
4. Se retorna el estadistico y el p-value.

## 7) Calidad y Estado de Verificacion

En esta iteracion se retiro la suite `pytest` del repositorio para reconstruirla despues con el nuevo alcance.
La validacion disponible ahora se centra en:

- health checks por servicio
- verificacion de rutas del gateway
- ejecucion de la pila Docker Compose

## 8) Estado Actual y Direccion

Estado de documentacion (decidido por el proyecto):

- se conserva documentacion solo en `docs/ARCHITECTURE.md` y `docs/CHANGELOG.md`
- el resto de documentos se reconstruira mas adelante, por iteraciones

Plan de iteraciones (documentacion):

1. Iteracion 1 (actual): consolidar arquitectura y estado de desarrollo.
2. Iteracion 2: expandir decisiones tecnicas y runbooks operativos.
3. Iteracion 3: refinamiento final y normalizacion completa de docs.

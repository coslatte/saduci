# SADECI-Core Architecture (Iteracion 1 de 3)

Este documento describe el estado real del backend en el repositorio actual.
Por ahora se mantiene documentacion centralizada solo en dos archivos: `ARCHITECTURE.md` y `CHANGELOG.md`.

## 1) Vision General

SADECI-Core es un backend de microservicios para inteligencia clinica en UCI con cuatro APIs FastAPI:

1. API Gateway (puerta de entrada, autenticacion y proxy)
2. Patient Service (CRUD + importacion CSV)
3. Prediction Service (predicciones clinicas + endpoints compatibles con plataforma)
4. Simulation Service (simulacion clinica, SimUCI y endpoints estadisticos)

Cada servicio de dominio tiene su propia base PostgreSQL en Docker Compose.

## 2) Diagrama de Alto Nivel

```text
Clientes HTTP
    |
    v
API Gateway :8000
    |-- /api/patients* ----------> Patient Service :8001 ---------> patient-db (PostgreSQL)
    |-- /api/predictions --------> Prediction Service :8002 ------> prediction-db (PostgreSQL)
    |-- /api/simulations* -------> Simulation Service :8003 ------> simulation-db (PostgreSQL)
    |
    |-- /prediccion, /prediccion/explain (proxy sin JWT para saduci-platform)
    |-- /simulation, /statistics/*   (proxy sin JWT para saduci-platform)
```

## 3) Componentes y Responsabilidades

### 3.1 API Gateway

Archivo principal: `services/api-gateway/main.py`

Responsabilidades:

- Login con JWT en `POST /auth/login`
- Validacion de token para rutas protegidas
- Rate limiting en login (en memoria, por IP)
- CORS configurable por variables de entorno
- Proxy HTTP asincrono a servicios internos usando `ServiceClient`

Rutas principales:

- `GET /health`
- `POST /auth/login`
- `GET|POST|PUT|DELETE /api/patients...`
- `POST /api/predictions`
- `POST /api/simulations`
- `POST /api/simulations/icu`
- `POST /prediccion`
- `POST /prediccion/explain`
- `POST /simulation`
- `POST /statistics/wilcoxon`
- `POST /statistics/friedman`

Notas:

- Credenciales de login se toman de `AUTH_USERNAME` y `AUTH_PASSWORD`.
- El gateway falla al iniciar si faltan esas variables.

### 3.2 Patient Service

Archivo principal: `services/patient/main.py`

Responsabilidades:

- CRUD de pacientes
- Importacion de pacientes por CSV
- Persistencia de datos clinicos JSON

Modelo principal:

- Tabla `patients`
- Campos clave: `patient_id`, `first_name`, `last_name`, `date_of_birth`, `gender`, `clinical_data`

Rutas principales:

- `GET /health`
- `GET /patients`
- `POST /patients`
- `GET /patients/{patient_id}`
- `PUT /patients/{patient_id}`
- `DELETE /patients/{patient_id}`
- `POST /patients/import`

Comportamiento relevante:

- valida extensiones `.csv`
- limite de tamano configurable con `MAX_CSV_SIZE_BYTES`
- intenta importar fila por fila y devuelve resumen + errores

### 3.3 Prediction Service

Archivo principal: `services/prediction/main.py`

Responsabilidades:

- Predicciones clinicas de ejemplo (dummy model)
- Persistencia de historial de predicciones
- Compatibilidad con saduci-platform (`/prediccion`, `/prediccion/explain`)

Modelos disponibles (`GET /models`):

1. `mortality_risk`
2. `length_of_stay`
3. `readmission_risk`

Rutas principales:

- `GET /health`
- `GET /models`
- `POST /predictions`
- `GET /predictions/{patient_id}`
- `POST /prediccion`
- `POST /prediccion/explain`

Notas:

- El endpoint de plataforma usa calculo determinista para probabilidad.
- Explainability soporta metodos: `LIME`, `SHAP`, `Gradientes Integrados`, `Mapas de Saliencia`.

### 3.4 Simulation Service

Archivo principal: `services/simulation/main.py`

Responsabilidades:

- Simulaciones clinicas de escenarios
- Simulacion UCI con SimUCI cuando esta disponible
- Fallback estadistico cuando SimUCI no esta disponible
- Pruebas estadisticas Wilcoxon y Friedman

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

- usa `simuci.Experiment`, `single_run`, `multiple_replication`
- requiere `services/simulation/data/centroids.csv`
- construye estadisticas de salida (`mean`, `std`, `min`, `max`, `median`)

## 4) Componentes Compartidos

### 4.1 Esquemas Pydantic

Ubicacion: `shared/schemas/`

- `health.py`
- `patient.py`
- `prediction.py`
- `simulation.py`
- `statistics.py`
- `user.py`

Uso:

- contratos de request/response
- validaciones de tipos
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
- `patient` + `patient-db`
- `prediction` + `prediction-db`
- `simulation` + `simulation-db`

Puntos relevantes:

- `depends_on` con `condition: service_healthy`
- reinicio `unless-stopped`
- databases sin exposicion publica directa
- servicios internos expuestos solo en localhost del host (`127.0.0.1`) excepto gateway

### 5.2 Entorno

Variables criticas:

- `SECRET_KEY`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `PATIENT_DB_PASSWORD`
- `PREDICTION_DB_PASSWORD`
- `SIMULATION_DB_PASSWORD`

Variables operativas:

- `CORS_ALLOW_ORIGINS`
- `CORS_ALLOW_CREDENTIALS`
- `PORT`
- `DATABASE_URL`

## 6) Flujo de Datos

### 6.1 Login y autorizacion

1. Cliente envia credenciales a `POST /auth/login`.
2. Gateway valida usuario/password y genera JWT.
3. Cliente usa `Authorization: Bearer <token>` en rutas protegidas.

### 6.2 Operaciones de pacientes

1. Cliente llama `GET|POST|PUT|DELETE /api/patients...` en gateway.
2. Gateway valida JWT.
3. Gateway reenvia a Patient Service.
4. Patient Service persiste/consulta en `patient-db`.

### 6.3 Prediccion clinica

1. Cliente llama `POST /api/predictions` o `POST /prediccion`.
2. Prediction Service ejecuta logica de modelo.
3. Se guarda resultado en `prediction-db` (ruta API principal).
4. Se devuelve prediccion y metadatos.

### 6.4 Simulacion clinica y estadistica

1. Cliente llama `POST /api/simulations`, `POST /api/simulations/icu` o `POST /simulation`.
2. Simulation Service ejecuta engine base o SimUCI.
3. Para estadistica, cliente llama `POST /statistics/wilcoxon` o `POST /statistics/friedman`.
4. Se retorna estadistico y p-value.

## 7) Calidad y Pruebas

El repositorio tiene una suite pytest amplia (137 tests reportados) que cubre:

- autenticacion y rate limiting en gateway
- enrutamiento/proxy
- CRUD de pacientes y CSV import
- modelos de prediccion y limites
- escenarios de simulacion
- endpoints estadisticos
- utilidades de auth y validacion de esquemas

Patron de test importante:

- para pruebas de servicios FastAPI, se sobreescribe `get_db` con SQLite in-memory + `StaticPool` para evitar errores de threading.

## 8) Estado Actual y Direccion

Estado de documentacion (decidido por el proyecto):

- Se conserva documentacion solo en `docs/ARCHITECTURE.md` y `docs/CHANGELOG.md`.
- El resto de documentos se ira reconstruyendo mas adelante, por iteraciones.

Plan de iteraciones (documentacion):

1. Iteracion 1 (actual): consolidar arquitectura y estado de desarrollo.
2. Iteracion 2: expandir decisiones tecnicas y runbooks operativos.
3. Iteracion 3: refinamiento final y normalizacion completa de docs.

# Arquitectura del backend

El backend contiene el API Gateway y los servicios de pacientes, predicción y simulación. Cada servicio FastAPI tiene su propio proceso y base PostgreSQL en Docker Compose.

## API Gateway

El punto de entrada es [`main.py`](../../src/backend/src/api-gateway/main.py). El gateway escucha en el puerto `8000`, valida tokens JWT y administra las cuentas de usuario. También reenvía operaciones a los servicios internos.

| Grupo | Rutas principales |
| --- | --- |
| Autenticación | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/change-password` |
| Administración | `GET`, `POST` y `DELETE /admin/users`; `GET`, `POST`, `PUT` y `DELETE /api/users` |
| Pacientes | `POST /api/patients`, `GET /api/patients/{mrn}`, `PUT /api/patients/{mrn}` |
| Predicciones | `POST /api/predictions`, `GET /api/predictions/models`, `GET /api/predictions/{patient_id}` |
| Simulaciones | `POST /api/simulations`, `GET /api/simulations/scenarios`, `GET /api/simulations/{patient_id}`, `POST /api/simulations/icu` |
| Compatibilidad del frontend | `POST /prediction`, `POST /prediction/explain`, `POST /simulation`, `POST /statistics/wilcoxon`, `POST /statistics/friedman` |

El gateway usa `api-gateway-db`. `AUTH_USERNAME` y `AUTH_PASSWORD` crean la cuenta administradora inicial cuando la base arranca sin datos.

## Patient Service

[`main.py`](../../src/backend/src/patient/main.py) expone `GET /health`, `POST /patients`, `GET /patients/{mrn}` y `PUT /patients/{mrn}`. El servicio guarda los registros en `patient-db`.

## Prediction Service

[`main.py`](../../src/backend/src/prediction/main.py) expone predicciones clínicas, historial y modelos disponibles. Las rutas `/prediction` y `/prediccion` atienden el formato que usa el frontend. Las rutas `/prediction/explain` y `/prediccion/explain` devuelven datos de explicabilidad.

El artefacto versionado está en [`models/v1/new_workflow.joblib`](../../src/backend/src/prediction/models/v1/new_workflow.joblib). El servicio guarda el historial en `prediction-db`.

La narrativa clínica es opcional. `PREDICTION_NARRATIVE_PROVIDER` selecciona `stub`, `local`, `gemini` o `huggingface`. Las variables `PREDICTION_LOCAL_LLM_*`, `PREDICTION_GEMINI_*` y `HUGGINGFACE_*` configuran los proveedores externos.

## Simulation Service

[`main.py`](../../src/backend/src/simulation/main.py) expone escenarios, simulaciones clínicas y pruebas Wilcoxon y Friedman. El servicio guarda el historial en `simulation-db`.

Cuando SimUCI está disponible, el servicio puede ejecutar el motor de simulación. La ruta compatible con el frontend usa un fallback estadístico si SimUCI no está disponible. El servicio también ofrece health check en `GET /health`.

## Esquemas y utilidades compartidos

[`src/shared/schemas/`](../../src/backend/src/shared/schemas/) define contratos Pydantic para autenticación, pacientes, predicciones, simulaciones, estadística y health checks. [`src/shared/utils/`](../../src/backend/src/shared/utils/) contiene utilidades de autenticación, cliente HTTP y logging.

## Persistencia y configuración local

[`docker-compose.yml`](../../src/backend/docker-compose.yml) inicia estos ocho servicios:

- `api-gateway`, `patient`, `prediction` y `simulation`.
- `api-gateway-db`, `patient-db`, `prediction-db` y `simulation-db`.

Cada servicio se conecta a su propia base. Compose publica el gateway en el host y enlaza los otros servicios a `127.0.0.1`. Las bases permanecen dentro de la red de Compose.

La configuración común está en [`src/backend/.env.example`](../../src/backend/.env.example). El README raíz explica cómo copiarla a `.env` y ejecutar Compose desde la raíz del proyecto.

## Configuración de Render

[`render.yaml`](../../render.yaml) declara el API Gateway, Prediction Service y Simulation Service con `rootDir: src/backend`. La definición no incluye el Patient Service ni las bases PostgreSQL. Compose sí incluye esos componentes para el stack local.

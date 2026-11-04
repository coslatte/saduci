# Contratos de API Finales — SADUCI

## 1. Convenciones Generales

- **Base URL (desarrollo):** `http://localhost:8000`
- **Base URL (producción):** Configurable mediante `API_URL` / `NEXT_PUBLIC_API_URL`
- **Autenticación:** `Authorization: Bearer <jwt_token>`
- **Formato:** JSON (request y response)
- **Errores:** `{ "detail": "mensaje de error" }` con código HTTP estándar
- **Timeouts:** 30 segundos para peticiones proxy

---

## 2. Endpoints Públicos (sin autenticación JWT)

### 2.1 Health Check

```
GET /health
Response: { "status": "healthy", "service": "api-gateway" }
```

### 2.2 Autenticación

#### POST /auth/login

Login con rate limiting (5 intentos por 60 segundos por IP).

```
Request:
{
  "username": "string",
  "password": "string"
}

Response 200:
{
  "access_token": "string (JWT)",
  "token_type": "bearer",
  "user": {
    "id": "int",
    "email": "string",
    "username": "string",
    "role": "ADMIN|ESPECIALISTA|MEDICO",
    "is_active": true,
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}

Error 401: { "detail": "Incorrect username or password" }
Error 429: { "detail": "Too many login attempts. Please try again later." }
```

#### POST /auth/register

```
Request:
{
  "email": "string (email)",
  "username": "string",
  "password": "string (min 8 chars)"
}

Response 201:
{
  "message": "Usuario registrado correctamente",
  "user": { ... UserResponse ... }
}

Error 400: { "detail": "El nombre de usuario ya está en uso" }
Error 400: { "detail": "El correo electrónico ya está registrado" }
Error 400: { "detail": "La contraseña debe tener al menos 8 caracteres" }
```

### 2.3 Predicciones (Platform)

#### POST /prediction

```
Request:
{
  "edad": 65,         // 14-61
  "diag_ing1": 5,     // 1-20
  "diag_ing2": 42,    // 39-173
  "diag_egr2": 22,    // 18-40
  "apache": 25,       // 18-40
  "tiempo_vam": 24    // 18-40
}

Response 200:
{
  "probability": 0.73,
  "probability_percent": 73.0,
  "predicted_class": 1,
  "predicted_label": "muere",
  "threshold": 0.5
}
```

#### POST /prediction/explain

```
Request:
{
  "edad": 65,
  "diag_ing1": 5,
  "diag_ing2": 42,
  "diag_egr2": 22,
  "apache": 25,
  "tiempo_vam": 24,
  "method": "SHAP",                // LIME|SHAP|Gradientes Integrados|Mapas de Saliencia
  "include_narrative": true,
  "ai_provider": "stub"            // stub|local|gemini|huggingface
}

Response 200:
{
  "method": "SHAP",
  "probability": 0.73,
  "predicted_class": 1,
  "predicted_label": "muere",
  "feature_names": ["edad", "apache", ...],
  "importances": [0.35, 0.28, ...],
  "rows": [
    {
      "feature_key": "edad",
      "feature_name": "Edad",
      "patient_value": 65.0,
      "patient_value_display": "65 años",
      "baseline_value": 52.3,
      "contribution": 0.15,
      "direction": "increase_risk"
    }
  ],
  "narrative": "El paciente presenta un riesgo elevado de mortalidad...",
  "narrative_provider": "stub"
}
```

#### POST /prediccion (alias español)

Idéntico a `POST /prediction`.

#### POST /prediccion/explain (alias español)

Idéntico a `POST /prediction/explain`.

### 2.4 Simulaciones (Platform)

#### POST /simulation

```
Request:
{
  "age": 65,            // 14-100
  "apache": 25,         // 0-36
  "d1": 5,              // 0-40
  "d2": 0,
  "d3": 0,
  "d4": 0,
  "diag_egreso2": 0,
  "artif_vent": 1,      // 0-2
  "vam_time": 120,      // 24-700h
  "uti_stay": 200,      // 0-200h
  "preuti_stay": 4,     // 0-34h
  "resp_insuf": 2,      // 0-5
  "percent": 3,         // 0-10
  "n_runs": 200         // 50-100000
}

Response 200:
{
  "simulation": {
    "pre_vam": { "mean": 4.2, "std": 0.8, "ci_lower": 3.6, "ci_upper": 4.8 },
    "vam": { "mean": 168.5, "std": 12.3, "ci_lower": 144.2, "ci_upper": 192.8 },
    "post_vam": { "mean": 72.1, "std": 8.5, "ci_lower": 55.4, "ci_upper": 88.8 },
    "uci": { "mean": 340.6, "std": 25.7, "ci_lower": 290.2, "ci_upper": 391.0 },
    "post_uci": { "mean": 48.0, "std": 6.2, "ci_lower": 35.8, "ci_upper": 60.2 }
  },
  "prediction": {
    "class": 1,
    "probability": 0.73
  }
}
```

### 2.5 Estadísticas

#### POST /statistics/wilcoxon

```
Request:
{
  "x": [1.2, 2.3, 3.1, ...],
  "y": [1.5, 2.1, 2.9, ...]
}

Response 200:
{
  "statistic": 12.0,
  "p_value": 0.0034
}
```

#### POST /statistics/friedman

```
Request:
{
  "samples": [[1.2, 2.3, ...], [1.5, 2.1, ...], [1.1, 1.9, ...]]
}

Response 200:
{
  "statistic": 8.72,
  "p_value": 0.0128
}
```

---

## 3. Endpoints Autenticados (JWT Requerido)

### 3.1 Usuario Actual

#### GET /auth/me

```
Headers: Authorization: Bearer <token>

Response 200:
{
  "id": 1,
  "email": "admin@saduci.com",
  "username": "admin",
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-06-21T00:00:00Z"
}
```

#### POST /auth/change-password

```
Headers: Authorization: Bearer <token>

Request:
{
  "currentPassword": "old_password",
  "newPassword": "new_password"       // min 8 chars
}

Response 200:
{ "message": "Contraseña actualizada correctamente." }
```

### 3.2 Gestión de Usuarios (Admin: ADMIN)

#### POST /api/users

```
Headers: Authorization: Bearer <token> (ADMIN only)

Request:
{
  "email": "user@saduci.com",
  "username": "nuevo_user",
  "password": "password123",
  "role": "ESPECIALISTA",       // ADMIN|ESPECIALISTA|MEDICO
  "is_active": true
}

Response 201: { ... UserResponse ... }
```

#### GET /api/users

```
Headers: Authorization: Bearer <token> (ADMIN only)

Query: ?role=ESPECIALISTA&skip=0&limit=100

Response 200: [ ... UserResponse[] ... ]
```

#### GET /api/users/{user_id}

```
Headers: Authorization: Bearer <token> (any authenticated)

Response 200: { ... UserResponse ... }
```

#### PUT /api/users/{user_id}

```
Headers: Authorization: Bearer <token> (ADMIN only)

Request:
{
  "email": "nuevo@saduci.com",
  "role": "ADMIN",
  "is_active": true
}

Response 200: { ... UserResponse ... }
```

#### DELETE /api/users/{user_id}

```
Headers: Authorization: Bearer <token> (ADMIN only)

Response 200: { "message": "Usuario eliminado correctamente." }
```

### 3.3 Admin Endpoints (Superuser)

#### GET /admin/users

```
Headers: Authorization: Bearer <token> (SUPERUSER only)

Response 200: [ ... UserResponse[] ... ]
```

#### POST /admin/users

```
Headers: Authorization: Bearer <token> (SUPERUSER only)

Request:
{
  "email": "admin@saduci.com",
  "username": "newadmin",
  "password": "securepass",
  "role": "ADMIN",
  "is_active": true
}

Response 201: { ... UserResponse ... }
```

#### DELETE /admin/users/{user_id}

```
Headers: Authorization: Bearer <token> (SUPERUSER only)

Response 200: { "message": "Usuario eliminado correctamente" }

Nota: No permite eliminarse a sí mismo.
Error 400: { "detail": "No puedes eliminar tu propia cuenta" }
```

### 3.4 Pacientes (ADMIN/ESPECIALISTA)

#### POST /api/patients

```
Headers: Authorization: Bearer <token>

Request:
{
  "mrn": "MRN-001",
  "first_name": "Juan",
  "last_name": "Pérez",
  "date_of_birth": "1980-05-15",
  "sex": "Masculino"
}

Response 201:
{
  "id": 1,
  "mrn": "MRN-001",
  "first_name": "Juan",
  "last_name": "Pérez",
  "date_of_birth": "1980-05-15",
  "sex": "Masculino",
  "created_at": "2026-06-21T00:00:00Z",
  "updated_at": "2026-06-21T00:00:00Z"
}
```

#### GET /api/patients/{mrn}

```
Headers: Authorization: Bearer <token> (any authenticated)

Response 200: { ... PatientResponse ... }
```

#### PUT /api/patients/{mrn}

```
Headers: Authorization: Bearer <token>

Request:
{
  "first_name": "Juan Carlos",
  "last_name": "Pérez García",
  "date_of_birth": "1980-05-15",
  "sex": "Masculino"
}
```

### 3.5 Predicciones (Autenticadas)

#### POST /api/predictions

```
Headers: Authorization: Bearer <token> (ADMIN/ESPECIALISTA)

Request:
{
  "patient_id": "P001",
  "model_name": "mortality_risk",
  "features": { "edad": 65, "apache": 25, "diag_ing1": 5, ... }
}

Response 201:
{
  "patient_id": "P001",
  "model_name": "mortality_risk",
  "prediction": { ... },
  "confidence": 0.85,
  "timestamp": "2026-06-21T12:00:00Z",
  "user_id": 1
}
```

#### GET /api/predictions/models

```
Headers: Authorization: Bearer <token> (any authenticated)

Response 200: ["mortality_risk", "length_of_stay", "readmission_risk"]
```

#### GET /api/predictions/{patient_id}

```
Headers: Authorization: Bearer <token> (any authenticated)

Response 200: [ ... PredictionResponse[] ... ]
```

### 3.6 Simulaciones (Autenticadas)

#### POST /api/simulations

```
Headers: Authorization: Bearer <token> (ADMIN/ESPECIALISTA)

Request:
{
  "patient_id": "P001",
  "scenario": "treatment_response",
  "parameters": { "age": 65, ... }
}

Response 201:
{
  "patient_id": "P001",
  "scenario": "treatment_response",
  "results": [ ... ],
  "timestamp": "2026-06-21T12:00:00Z",
  "user_id": 1
}
```

#### GET /api/simulations/scenarios

```
Headers: Authorization: Bearer <token> (any authenticated)

Response 200: ["treatment_response", "vital_signs_projection", "intervention_outcomes", "icu_patient_simulation"]
```

#### GET /api/simulations/{patient_id}

```
Headers: Authorization: Bearer <token> (any authenticated)

Response 200: [ ... SimulationResponse[] ... ]
```

#### POST /api/simulations/icu

```
Headers: Authorization: Bearer <token> (ADMIN/ESPECIALISTA)

Request:
{
  "patient_id": "P001",
  "age": 65,
  "apache": 25,
  "diagnosis_admission1": 5,
  "diagnosis_admission2": 0,
  "diagnosis_admission3": 0,
  "diagnosis_admission4": 0,
  "respiratory_insufficiency": 2,
  "artificial_ventilation": 1,
  "uti_stay": 200,
  "vam_time": 120,
  "preuti_stay_time": 4,
  "percent": 10,
  "n_replications": 100
}

Response 200:
{
  "patient_id": "P001",
  "simulation_results": { ... TimeStats ... },
  "statistics": { "mean": ..., "std": ..., "ci_lower": ..., "ci_upper": ... },
  "timestamp": "2026-06-21T12:00:00Z",
  "user_id": 1
}
```

---

## 4. Mapa de Endpoints con Nivel de Acceso

| Método | Ruta | Tipo | Auth | Rol Mínimo | Servicio Destino |
|--------|------|------|------|------------|-----------------|
| GET | `/health` | Público | No | — | API Gateway |
| POST | `/auth/login` | Público | No | — | User Service |
| POST | `/auth/register` | Público | No | — | User Service |
| GET | `/auth/me` | Protegido | JWT | Cualquiera | User Service |
| POST | `/auth/change-password` | Protegido | JWT | Cualquiera | User Service |
| POST | `/api/users` | Protegido | JWT | ADMIN | User Service |
| GET | `/api/users` | Protegido | JWT | ADMIN | User Service |
| GET | `/api/users/{id}` | Protegido | JWT | Cualquiera | User Service |
| PUT | `/api/users/{id}` | Protegido | JWT | ADMIN | User Service |
| DELETE | `/api/users/{id}` | Protegido | JWT | ADMIN | User Service |
| GET | `/admin/users` | Protegido | JWT | SUPERUSER | User Service |
| POST | `/admin/users` | Protegido | JWT | SUPERUSER | User Service |
| DELETE | `/admin/users/{id}` | Protegido | JWT | SUPERUSER | User Service |
| POST | `/api/patients` | Protegido | JWT | ESPECIALISTA | Patient Service |
| GET | `/api/patients/{mrn}` | Protegido | JWT | Cualquiera | Patient Service |
| PUT | `/api/patients/{mrn}` | Protegido | JWT | ESPECIALISTA | Patient Service |
| POST | `/api/predictions` | Protegido | JWT | ESPECIALISTA | Prediction Service |
| GET | `/api/predictions/models` | Protegido | JWT | Cualquiera | Prediction Service |
| GET | `/api/predictions/{id}` | Protegido | JWT | Cualquiera | Prediction Service |
| POST | `/prediction` | Público | No | — | Prediction Service |
| POST | `/prediction/explain` | Público | No | — | Prediction Service |
| POST | `/prediccion` | Público | No | — | Prediction Service |
| POST | `/prediccion/explain` | Público | No | — | Prediction Service |
| POST | `/api/simulations` | Protegido | JWT | ESPECIALISTA | Simulation Service |
| GET | `/api/simulations/scenarios` | Protegido | JWT | Cualquiera | Simulation Service |
| GET | `/api/simulations/{id}` | Protegido | JWT | Cualquiera | Simulation Service |
| POST | `/api/simulations/icu` | Protegido | JWT | ESPECIALISTA | Simulation Service |
| POST | `/simulation` | Público | No | — | Simulation Service |
| POST | `/statistics/wilcoxon` | Público | No | — | Simulation Service |
| POST | `/statistics/friedman` | Público | No | — | Simulation Service |

---

## 5. Formato de Errores

Todos los errores siguen el formato estándar FastAPI:

```json
{
  "detail": "Mensaje descriptivo del error"
}
```

### Códigos HTTP Utilizados

| Código | Significado | Uso |
|--------|-------------|-----|
| 200 | OK | Respuesta exitosa |
| 201 | Created | Recurso creado |
| 400 | Bad Request | Validación de datos fallida |
| 401 | Unauthorized | JWT inválido o ausente |
| 403 | Forbidden | Rol insuficiente |
| 404 | Not Found | Recurso no encontrado |
| 429 | Too Many Requests | Rate limit excedido |
| 502 | Bad Gateway | Servicio interno no disponible |
| 504 | Gateway Timeout | Timeout en servicio interno |

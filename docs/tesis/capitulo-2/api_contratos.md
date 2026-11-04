# Contratos de API SADUCI

## Base URL

| Entorno | URL Base |
|---------|----------|
| Desarrollo local | `http://localhost:8000` |
| Producción | Configurable via `CORS_ALLOW_ORIGINS` |

---

## Autenticación

### POST /auth/login

Iniciar sesión y obtener token JWT.

**Request:**
```json
{
  "email": "doctor@hospital.cu",
  "password": "contraseña123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Errores:**
- 401: Credenciales inválidas
- 422: Validación de schema fallida

---

## Predicción Clínica

### POST /prediction *(Ruta pública para saduci-platform)*

Ejecutar predicción de mortalidad utilizando el modelo entrenado.

**Request:**
```json
{
  "edad": 65,
  "diag_ing1": 5,
  "diag_ing2": 72,
  "diag_egr2": 22,
  "apache": 25,
  "tiempo_vam": 72
}
```

**Validación:**
- `edad`: integer, 14 ≤ valor ≤ 61
- `diag_ing1`: integer, 1 ≤ valor ≤ 20
- `diag_ing2`: integer, 39 ≤ valor ≤ 173
- `diag_egr2`: integer, 18 ≤ valor ≤ 40
- `apache`: integer, 18 ≤ valor ≤ 40
- `tiempo_vam`: integer, 18 ≤ valor ≤ 40

**Response (200):**
```json
{
  "probability": 0.73,
  "probability_percent": 73.0,
  "predicted_class": 1,
  "predicted_label": "muere",
  "threshold": 0.5
}
```

---

### POST /prediction/explain *(Ruta pública para saduci-platform)*

Obtener predicción con explicaciones detalladas de características.

**Request:**
```json
{
  "edad": 65,
  "diag_ing1": 5,
  "diag_ing2": 72,
  "diag_egr2": 22,
  "apache": 25,
  "tiempo_vam": 72,
  "method": "SHAP",
  "include_narrative": true,
  "ai_provider": "stub",
  "temperature": 0.2
}
```

**Campos opcionales:**
- `method`: `"LIME"` | `"SHAP"` | `"Gradientes Integrados"` | `"Mapas de Saliencia"` (default: SHAP)
- `include_narrative`: boolean (default: false)
- `ai_provider`: `"stub"` | `"local"` | `"gemini"` | `"huggingface"` (default: stub)
- `ai_model`: string (opcional, específico del proveedor)
- `temperature`: float, 0.0 ≤ valor ≤ 1.0 (default: 0.2)

**Response (200):**
```json
{
  "method": "SHAP",
  "probability": 0.73,
  "predicted_class": 1,
  "predicted_label": "muere",
  "feature_names": ["edad", "diag_ing1", "diag_ing2", "diag_egr2", "apache", "tiempo_vam"],
  "importances": [0.25, 0.15, 0.10, 0.08, 0.30, 0.12],
  "rows": [
    {
      "feature_key": "apache",
      "feature_name": "APACHE II Score",
      "patient_value": 25,
      "patient_value_display": "25",
      "baseline_value": 18,
      "contribution": 0.30,
      "direction": "increase_risk"
    },
    {
      "feature_key": "edad",
      "feature_name": "Edad del Paciente",
      "patient_value": 65,
      "patient_value_display": "65 años",
      "baseline_value": 55,
      "contribution": 0.25,
      "direction": "increase_risk"
    }
  ],
  "narrative": "El paciente presenta un riesgo elevado de mortalidad...",
  "narrative_provider": "stub",
  "narrative_model": null
}
```

**Errores:**
- 400: Datos de entrada inválidos
- 500: Error en inferencia del modelo

---

## /health

Health check del Prediction Service.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "prediction",
  "version": "1.2.0",
  "timestamp": "2026-05-09T18:00:00Z"
}
```

---

## Simulación Clínica

### POST /simulations/icu

Ejecutar simulación clínica de paciente en UCI.

**Request:**
```json
{
  "patient_id": "UCI-2026-001",
  "age": 58,
  "diagnosis_admission1": 12,
  "diagnosis_admission2": 5,
  "diagnosis_admission3": 0,
  "diagnosis_admission4": 0,
  "apache": 22,
  "respiratory_insufficiency": 3,
  "artificial_ventilation": 2,
  "uti_stay": 168,
  "vam_time": 96,
  "preuti_stay_time": 12,
  "percent": 10,
  "n_replications": 200
}
```

**Validación:**
- `age`: integer, 14 ≤ valor ≤ 100
- `apache`: integer, 0 ≤ valor ≤ 70
- `uti_stay`: integer, 1 ≤ valor ≤ 8760
- `vam_time`: integer, 0 ≤ valor ≤ 8760
- `n_replications`: integer, 1 ≤ valor ≤ 1000

**Response (200):**
```json
{
  "patient_id": "UCI-2026-001",
  "simulation_results": {
    "mortality_rate": 0.32,
    "survival_probability": 0.68
  },
  "statistics": {
    "mean": 165.4,
    "std": 12.3,
    "ci_lower": 163.1,
    "ci_upper": 167.7
  },
  "timestamp": "2026-05-09T18:05:00Z"
}
```

---

### GET /simulations/{patient_id}

Consultar historial de simulaciones de un paciente.

**Response (200):**
```json
{
  "patient_id": "UCI-2026-001",
  "simulations": [
    {
      "id": "sim-abc123",
      "scenario": "icu_scenario",
      "parameters": {...},
      "results": {...},
      "created_at": "2026-05-09T18:05:00Z"
    }
  ]
}
```

---

### GET /scenarios

Listar escenarios de simulación disponibles.

**Response (200):**
```json
{
  "scenarios": [
    {
      "id": "treatment_response",
      "name": "Respuesta al Tratamiento",
      "description": "Simula la respuesta del paciente a diferentes intervenciones terapéuticas"
    },
    {
      "id": "vital_signs_projection",
      "name": "Proyección de Signos Vitales",
      "description": "Proyecta la evolución de signos vitales basada en parámetros actuales"
    },
    {
      "id": "intervention_outcomes",
      "name": "Desenlaces de Intervenciones",
      "description": "Evalúa los posibles desenlaces de decisiones de tratamiento"
    }
  ]
}
```

---

## Pruebas Estadísticas

### POST /stats/wilcoxon

Prueba de Mann-Whitney-Wilcoxon para comparación de dos muestras independientes.

**Request:**
```json
{
  "sample_a": [12.5, 14.2, 15.8, 13.1, 16.0],
  "sample_b": [10.1, 11.5, 12.3, 9.8, 11.0],
  "alternative": "two-sided"
}
```

**Response (200):**
```json
{
  "statistic": 17.5,
  "p_value": 0.015,
  "alternative": "two-sided",
  "interpretation": "Las muestras son significativamente diferentes (p < 0.05)"
}
```

---

### POST /stats/friedman

Prueba de Friedman para comparación de múltiples grupos relacionados.

**Request:**
```json
{
  "groups": {
    "group_a": [4.2, 5.1, 4.8, 5.3],
    "group_b": [3.8, 4.5, 4.2, 4.6],
    "group_c": [5.0, 5.8, 5.5, 6.1]
  }
}
```

**Response (200):**
```json
{
  "statistic": 9.45,
  "p_value": 0.0089,
  "df": 2,
  "interpretation": "Existen diferencias significativas entre los grupos (p < 0.05)"
}
```

---

## Gestión de Usuarios

### POST /users *(Ruta protegida — Admin)*

Crear nuevo usuario.

**Headers:**
```
Authorization: Bearer <token_admin>
```

**Request:**
```json
{
  "email": "nuevo@hospital.cu",
  "username": "dr_nuevo",
  "password": "SecurePass123",
  "is_superuser": false,
  "is_active": true
}
```

**Response (201):**
```json
{
  "id": 42,
  "email": "nuevo@hospital.cu",
  "username": "dr_nuevo",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2026-05-09T18:10:00Z",
  "updated_at": "2026-05-09T18:10:00Z"
}
```

---

## Tabla Resumen de Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | /auth/login | No | Iniciar sesión |
| POST | /prediction | No* | Predicción de mortalidad |
| POST | /prediction/explain | No* | Predicción con explicabilidad |
| GET | /api/predictions/models | JWT | Listar modelos disponibles |
| GET | /api/predictions/{id} | JWT | Obtener predicción por ID |
| POST | /api/predictions | JWT | Crear predicción (almacenar) |
| POST | /simulations/icu | No* | Simulación UCI |
| GET | /simulations/{patient_id} | JWT | Historial de simulaciones |
| GET | /scenarios | No | Listar escenarios |
| POST | /stats/wilcoxon | No* | Prueba de Wilcoxon |
| POST | /stats/friedman | No* | Prueba de Friedman |
| POST | /users | JWT (Admin) | Crear usuario |
| GET | /health | No | Health check |

*\*Rutas no autenticadas para saduci-platform (CORS configurado)*

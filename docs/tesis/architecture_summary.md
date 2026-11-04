# Resumen de Arquitectura: Saduci Platform (Versión Final)

Este informe consolida la arquitectura FINAL del proyecto `saduci-platform`, reflejando el estado completo del software con 5 microservicios, módulo de usuarios, control de acceso basado en roles y persistencia de datos. Sirve como referencia para la redacción del Capítulo 3 de la tesis.

---

## 1. Stack Tecnológico Final

- **Framework Principal:** Next.js 16 (App Router) + React 19
- **Runtime Backend:** Python 3.13+ / FastAPI
- **Runtime Frontend:** Bun (bundler, dev server, test runner)
- **Estilos:** Tailwind CSS v4, utility-first
- **Testing:** Bun test + Happy DOM + React Testing Library (324 tests)
- **ML:** scikit-learn 1.6.1 + imbalanced-learn + joblib
- **Simulación:** SimUCI (opcional) + fallback SHA-256
- **BD:** PostgreSQL 16.3 (Database per Service)
- **Orquestación:** Docker Compose (8 contenedores)

---

## 2. Arquitectura de Microservicios (5 Servicios)

```
                    saduci-platform (Next.js 16 :3000)
                              |
                         API Gateway (:8000)
                        /    |    |    \
                       /     |    |     \
              User (:8004)  Patient (:8001)  Prediction (:8002)  Simulation (:8003)
                  |              |                |                    |
               user-db       patient-db      prediction-db        simulation-db
```

### Servicios

| Servicio | Puerto | BD | Responsabilidad |
|----------|--------|-----|-----------------|
| API Gateway | 8000 | — | JWT auth, rate limiting, proxy, CORS |
| User Service | 8004 | user-db | Usuarios, roles, autenticación |
| Patient Service | 8001 | patient-db | Registro de pacientes |
| Prediction Service | 8002 | prediction-db | Inferencia ML, XAI, narrativas |
| Simulation Service | 8003 | simulation-db | SimUCI, estadísticas |

---

## 3. Módulo de Usuarios y Roles

### Roles (UserRole enum)
- **ADMIN**: Acceso total, CRUD de usuarios
- **ESPECIALISTA**: Crear predicciones y simulaciones
- **MEDICO**: Solo lectura (rol por defecto)

### Autenticación JWT
- Claims: sub, uid, email, role, is_superuser, exp
- Algoritmo: HS256 con SECRET_KEY configurable
- Rate limiting: 5 intentos/minuto en login

### Dependencias FastAPI
- `get_current_user` → cualquier autenticado
- `require_admin` → solo ADMIN
- `require_superuser` → solo is_superuser
- `require_especialista_or_admin` → ADMIN o ESPECIALISTA

---

## 4. Endpoints Principales

### Públicos (sin JWT)
`POST /auth/login`, `POST /auth/register`, `POST /prediction`, `POST /prediction/explain`, `POST /simulation`, `POST /statistics/wilcoxon`, `POST /statistics/friedman`, `GET /health`

### Protegidos (con JWT)
`GET /auth/me`, `POST /auth/change-password`, `POST/GET/PUT/DELETE /api/users`, `POST/GET /api/predictions`, `POST/GET /api/simulations`, `POST /api/simulations/icu`, `POST/GET/PUT /api/patients`

### Admin (superuser)
`GET/POST/DELETE /admin/users`

---

## 5. Modelo de Datos

### user-db
- `users`: id, username, email, hashed_password, role, is_active, created_at, updated_at

### patient-db
- `patients`: id, mrn, first_name, last_name, date_of_birth, sex, created_at, updated_at

### prediction-db
- `predictions`: id, patient_id, model_name, features (JSON), prediction (JSON), confidence, user_id, created_at

### simulation-db
- `simulations`: id, patient_id, scenario, parameters (JSON), results (JSON), user_id, created_at
- `statistical_tests`: id, test_name, samples (JSON), statistic, p_value, interpretation, created_at

---

## 6. Predicción Clínica

- **Modelo entrenado:** `new_workflow.joblib` (pipeline imblearn)
- **Features:** edad, diag_ing1, diag_ing2, diag_egr2, apache, tiempo_vam
- **Modelos:** mortality_risk, length_of_stay, readmission_risk
- **XAI:** SHAP, LIME, Gradientes Integrados, Mapas de Saliencia
- **Narrativa:** stub, local LLM, Gemini, HuggingFace
- **Threshold configurable (default: 0.5)**

---

## 7. Simulación Clínica

- **Escenarios:** treatment_response, vital_signs_projection, intervention_outcomes, icu_patient_simulation
- **Motor:** SimUCI (single_run, multiple_replication)
- **Fallback:** SHA-256 determinista
- **Estadísticas:** mean, std, CI 95%, mortality_rate
- **Pruebas:** Wilcoxon signed-rank, Friedman chi-square

---

## 8. Frontend (Atomic Design)

- **Atoms:** Input, Button, Select, Badge, Label, Spinner, Skeleton, HelpTooltipButton
- **Molecules:** Card, DataTable, FormField, Alert, Toast, NavBreadcrumb
- **Organisms:** Navbar, Sidebar, AppError
- **Layouts:** AppShell, Container, Flex, Grid, Stack
- **Páginas:** /prediction, /simulation, /statistics, /login, /register, /admin/users, /settings, /registros/{simulaciones, predicciones, estadisticas}

---

## 9. Infraestructura Docker

- 8 contenedores: 5 servicios + 4 bases de datos
- Red: saduci-network (bridge)
- Health checks: /health con intervalos de 30s
- Dependencias: condition: service_healthy
- Restart: unless-stopped
- Solo API Gateway expuesto públicamente

---

## 10. Seguridad

- JWT stateless con expiración (30 min default)
- Passwords hasheadas con pbkdf2_sha256
- Rate limiting en login (5 req/60s/IP)
- CORS configurable
- Validación de inputs con Pydantic
- Tracking de usuario en todas las operaciones (X-User-ID)
- Protección de autoborrado en admin
- Aislamiento de bases de datos en red interna Docker

---

## 11. Testing

- **Framework:** Bun test + Happy DOM + Testing Library
- **Cobertura:** 324 tests unitarios
- **Tipos:** tests atómicos, lógica de dominio, integración
- **Setup:** `src/test/setup.ts` con `@happy-dom/global-registrator`

---

## Historial de Versiones

| Versión | Fecha | Cambios Clave |
|---------|-------|---------------|
| 1.3.0 | 2026-06 | +User Service, +Patient Service, roles, CRUD usuarios, rate limiting, tracking |
| 1.2.0 | 2026-03 | Documentación consolidada, health checks |
| 1.1.0 | 2026-03 | SimUCI, fallback SHA-256, tests |
| 1.0.0 | 2024-01 | Release inicial con 3 servicios |

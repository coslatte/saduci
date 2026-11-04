# Implementación Final de SADUCI

## 1. Visión General

Este documento describe la implementación final de SADUCI, detallando la evolución desde el diseño arquitectónico inicial (Capítulo 2) hasta el sistema completo. La implementación se caracteriza por una arquitectura de microservicios madura con 5 servicios independientes, un sistema completo de gestión de usuarios basado en roles, y la integración de predicción clínica, simulación y pruebas estadísticas.

---

## 2. Stack Tecnológico Final

### 2.1 Frontend (saduci-platform)

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| Framework Web | Next.js | 16.1.6 | App Router + React Server Components |
| UI Library | React | 19.2.3 | Concurrent Features, Server Components |
| Runtime | Bun | 1.3+ | Bundler, dev server, test runner |
| Estilos | Tailwind CSS | v4 | Utility-first CSS |
| Gráficos | Recharts | — | Visualización de datos clínicos |
| Íconos | react-icons | — | SVG vectoriales |
| Tablas | @tanstack/react-table | — | Tablas headless con ordenamiento |
| Testing | Bun test + Happy DOM | — | Testing Library para React |

### 2.2 Backend (saduci-core)

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| API Gateway | FastAPI (Python) | Autenticación JWT, rate limiting, proxy |
| ML Services | scikit-learn 1.6.1 + imbalanced-learn | Inferencia de modelos |
| Simulación | SimUCI (opcional) | Motor de simulación clínica |
| Serialización | joblib | Modelos ML entrenados |
| Base de Datos | PostgreSQL 16.3 | Persistencia por servicio (×4) |
| Migraciones | Alembic | Control de versiones de esquemas |
| Orquestación | Docker Compose | 8 contenedores |

### 2.3 Infraestructura

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| Contenedores | Docker + Docker Compose | Despliegue modular y reproducible |
| Health Checks | HTTP /health | Monitoreo de disponibilidad |
| Red | Docker internal network | Aislamiento de bases de datos |
| Política de reinicio | unless-stopped | Recuperación automática |

---

## 3. Servicios Implementados

### 3.1 API Gateway (:8000)

El API Gateway es el único punto de entrada público. Sus responsabilidades son:

- **Autenticación JWT**: Validación de tokens, extracción de claims (uid, role, is_superuser)
- **Rate Limiting**: Máximo 5 intentos de login por 60 segundos por IP
- **Enrutamiento**: Proxy a servicios internos según la ruta
- **Autorización**: Dependencias FastAPI para control de acceso por rol
- **CORS**: Configurable para múltiples orígenes
- **Tracking**: Headers `X-User-ID`, `X-User-Role`, `X-User-Username` a servicios internos

#### Dependencias de Autorización

| Dependencia | Acceso |
|-------------|--------|
| `get_current_user` | Cualquier usuario con JWT válido |
| `require_admin` | Solo rol ADMIN |
| `require_superuser` | Solo is_superuser=True |
| `require_especialista_or_admin` | ADMIN o ESPECIALISTA |

#### Service Clients

El gateway mantiene 4 clientes HTTP asíncronos para comunicación con servicios internos:
- `prediction_client` → Prediction Service (:8002)
- `simulation_client` → Simulation Service (:8003)
- `patient_client` → Patient Service (:8001)
- `user_client` → User Service (:8004)

### 3.2 User Service (:8004)

Servicio interno de gestión de usuarios y autenticación.

**Responsabilidades:**
- Registro y autenticación de usuarios
- CRUD completo de usuarios
- Hash de contraseñas (pbkdf2_sha256)
- Seed de datos iniciales (admin + demo users)

**Endpoints internos:**
- `POST /auth/login` - Autenticar usuario
- `POST /auth/register` - Registrar nuevo usuario
- `POST /users` - Crear usuario (admin)
- `GET /users` - Listar usuarios (con filtro `?role=`)
- `GET /users/{id}` - Obtener usuario por ID
- `PUT /users/{id}` - Actualizar usuario
- `DELETE /users/{id}` - Eliminar usuario
- `POST /users/{id}/change-password` - Cambiar contraseña

### 3.3 Patient Service (:8001)

Servicio interno de registro de pacientes.

**Responsabilidades:**
- Registro de pacientes con MRN (Medical Record Number)
- Consulta y actualización de datos demográficos

**Endpoints internos:**
- `POST /patients` - Crear paciente
- `GET /patients/{mrn}` - Obtener paciente por MRN
- `PUT /patients/{mrn}` - Actualizar paciente

### 3.4 Prediction Service (:8002)

Servicio de inferencia de modelos de Machine Learning.

**Modelos disponibles:**
1. `mortality_risk` - Riesgo de mortalidad (modelo entrenado + heurístico)
2. `length_of_stay` - Estancia hospitalaria (heurístico)
3. `readmission_risk` - Riesgo de reingreso (heurístico)

**Características:**
- Pipeline entrenado: `new_workflow.joblib` (imblearn + scikit-learn)
- 6 features: edad, diag_ing1, diag_ing2, diag_egr2, apache, tiempo_vam
- Threshold configurable (default: 0.5)
- Explicabilidad por features (método de perturbación)
- Generación de narrativa clínica (proveedores: stub, local LLM, Gemini, HuggingFace)
- Persistencia de predicciones con `user_id` para tracking

### 3.5 Simulation Service (:8003)

Servicio de simulación clínica y pruebas estadísticas.

**Escenarios disponibles:**
1. `treatment_response` - Respuesta al tratamiento
2. `vital_signs_projection` - Proyección de signos vitales
3. `intervention_outcomes` - Resultados de intervenciones
4. `icu_patient_simulation` - Simulación completa de paciente UCI

**Características:**
- Integración con SimUCI (engine de simulación de eventos discretos)
- Fallback determinista SHA-256 cuando SimUCI no está disponible
- Pruebas estadísticas: Wilcoxon Signed-Rank, Friedman Chi-Square
- Persistencia de simulaciones con `user_id` para tracking
- Cálculo de estadísticas: mean, std, CI 95%

---

## 4. Componentes Compartidos (Shared)

Ubicados en `src/shared/`:

### 4.1 Schemas Pydantic
- `health.py` - Health check response
- `user.py` - User schemas + UserRole enum
- `patient.py` - Patient CRUD schemas
- `prediction.py` - Prediction + explainability schemas
- `simulation.py` - Simulation schemas (ICU, platform)
- `statistics.py` - Wilcoxon + Friedman request/response

### 4.2 Utilidades
- `auth.py` - JWT create/verify, password hash/verify
- `logger.py` - Logger factory estandarizado
- `http_client.py` - Cliente HTTP asíncrono (ServiceClient)

### 4.3 Constantes
- `api_paths.py` - Constantes de rutas de API

### 4.4 Routers
- `health.py` - Router compartido de health check

---

## 5. Implementación Frontend

### 5.1 Gestión de Usuarios (`/admin/users`)
- Página protegida para administradores
- Fetch de usuarios desde `/api/admin/users` con JWT
- Lista de usuarios con badges de rol y estado
- Formulario inline de creación con validación
- Eliminación con confirmación (protección de autoborrado)

### 5.2 Registros (`/registros/`)
- Tres vistas: simulaciones, predicciones, estadísticas
- Tablas con datos mapeados desde el backend (recordsApi.ts)
- Permisos contextuales según el rol del usuario
- Formatos normalizados (fechas, estados, tipos)

### 5.3 Permisos en Interfaz (`recordPermissions.ts`)
- `Administrador`: CRUD completo en todos los recursos
- `Especialista`: Crear, editar, ver; no puede eliminar simulaciones
- `Médico`: Solo lectura

### 5.4 Autenticación (`auth.tsx`)
- Contexto React con AuthProvider
- Token almacenado en localStorage (saduci_token)
- Hydration de sesión al montar la aplicación
- Normalización de roles entre backend y frontend
- Login, registro y logout

### 5.5 Página de Configuración (`/settings`)
- Perfil de usuario: avatar, nombre, email, rol
- Cambio de contraseña con validación (mín 8 caracteres, confirmación)

---

## 6. Modelo de Despliegue

### 6.1 Contenedores Docker

```yaml
Servicios (8 contenedores):
  api-gateway:  :8000  (público)
  user:         :8004  (interno)
  patient:      :8001  (interno)
  prediction:   :8002  (interno)
  simulation:   :8003  (interno)
  user-db:      :5432  (PostgreSQL)
  patient-db:   :5432  (PostgreSQL)
  prediction-db::5432  (PostgreSQL)
  simulation-db::5432  (PostgreSQL)
```

### 6.2 Red
- Todos los servicios en `saduci-network` (bridge)
- Bases de datos NO expuestas públicamente
- Solo API Gateway expuesto al host

### 6.3 Health Checks
- Todos los servicios tienen endpoint `/health`
- Docker Compose usa `condition: service_healthy` para dependencias
- Intervalo: 30s, timeout: 10s, reintentos: 3

---

## 7. Variables de Entorno Críticas

| Variable | Propósito |
|----------|-----------|
| `SECRET_KEY` | Clave para firmar JWT |
| `AUTH_USERNAME` | Usuario admin inicial |
| `AUTH_PASSWORD` | Contraseña admin inicial |
| `CORS_ALLOW_ORIGINS` | Orígenes CORS permitidos |
| `PREDICTION_THRESHOLD` | Umbral de clasificación (default: 0.5) |
| `PREDICTION_NARRATIVE_PROVIDER` | Proveedor de narrativa (stub, local, gemini, huggingface) |
| `DATABASE_URL` | URL de conexión a PostgreSQL (por servicio) |

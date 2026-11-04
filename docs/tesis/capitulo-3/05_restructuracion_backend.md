# Reestructuración del Backend — SADUCI

## 1. Evolución Arquitectónica

El backend de SADUCI experimentó una evolución significativa desde su diseño inicial (descrito en el Capítulo 2) hasta la implementación final. Esta sección documenta los cambios, las motivaciones y el resultado final.

---

## 2. Estado Inicial (Capítulo 2)

### 2.1 Topología Original (3 Servicios)

```
API Gateway :8000
  ├── Prediction Service :8002  →  prediction-db
  └── Simulation Service :8003  →  simulation-db
```

### 2.2 Limitaciones Identificadas

1. **Usuarios embebidos**: La tabla `users` estaba acoplada a `prediction-db`, mezclando dominio de identidad con dominio clínico
2. **Sin servicio de pacientes**: No existía un registro centralizado de pacientes
3. **Roles básicos**: Solo existía `is_superuser` (booleano), sin roles diferenciados
4. **Sin tracking de usuario**: Las predicciones y simulaciones no registraban qué usuario las creó
5. **Sin rate limiting**: El endpoint de login no tenía protección contra fuerza bruta
6. **Sin migraciones**: No se usaba Alembic para control de versiones de esquemas
7. **Endpoints de usuarios limitados**: No existía CRUD completo de usuarios

---

## 3. Estado Final (Capítulo 3)

### 3.1 Topología Final (5 Servicios)

```
API Gateway :8000
  ├── User Service :8004        →  user-db
  ├── Patient Service :8001     →  patient-db
  ├── Prediction Service :8002  →  prediction-db
  └── Simulation Service :8003  →  simulation-db
```

### 3.2 Resumen de Cambios

| Aspecto | Antes (Cap. 2) | Después (Cap. 3) | Beneficio |
|---------|----------------|------------------|-----------|
| Servicios | 3 | 5 | Desacoplamiento de dominios |
| Bases de datos | 2 | 4 | Database per Service completo |
| Usuarios | Tabla en prediction-db | Microservicio independiente | Separación de concerns |
| Roles | is_superuser (bool) | ADMIN/ESPECIALISTA/MEDICO | Control de acceso granular |
| Pacientes | Inexistente | Servicio independiente | Registro clínico formal |
| Tracking | No | user_id en predicciones/simulaciones | Auditoría de operaciones |
| Rate limiting | No | 5 req/60s en login | Seguridad contra fuerza bruta |
| Migraciones | No | Alembic | Control de versiones BD |
| Contraseñas | Sin política | Mín 8 chars, pbkdf2_sha256 | Seguridad mejorada |

---

## 4. Nuevos Servicios en Detalle

### 4.1 User Service (:8004)

**Creación:** Servicio nuevo, no existía en la arquitectura inicial.

**Razón de creación:**
- Separar la gestión de identidades del dominio de predicciones
- Implementar un modelo de roles completo (ADMIN, ESPECIALISTA, MEDICO)
- Proporcionar CRUD completo de usuarios con autorización
- Centralizar políticas de seguridad (contraseñas, seed data)

**Base de datos:** user-db (PostgreSQL)
**Tabla:** `users` con campos: id, username, email, hashed_password, role, is_active, created_at, updated_at

**Endpoints internos:** 8 endpoints (auth + CRUD)

### 4.2 Patient Service (:8001)

**Creación:** Servicio nuevo, no existía en la arquitectura inicial.

**Razón de creación:**
- Proporcionar un registro formal de pacientes con MRN único
- Separar datos demográficos de pacientes del dominio de predicciones
- Permitir consulta y actualización de información demográfica

**Base de datos:** patient-db (PostgreSQL)
**Tabla:** `patients` con campos: id, mrn, first_name, last_name, date_of_birth, sex, created_at, updated_at

**Endpoints internos:** 3 endpoints (CRUD por MRN)

---

## 5. Servicios Existentes Mejorados

### 5.1 API Gateway (:8000)

**Mejoras respecto a la versión inicial:**

| Característica | Antes | Después |
|----------------|-------|---------|
| Service Clients | 2 (prediction, simulation) | 4 (+ user, + patient) |
| Autorización | Básica (is_superuser) | 4 dependencias (get_current_user, require_admin, require_superuser, require_especialista_or_admin) |
| Rate limiting | No | Login: 5 req/60s por IP |
| CORS | Fijo | Configurable via variables de entorno |
| Error handling | Básico | Extracción de detalle upstream |
| Tracking headers | No | X-User-ID, X-User-Role, X-User-Username |
| User endpoints | Solo /admin/users (GET/POST/DELETE) | CRUD completo: /api/users (GET/POST/PUT/DELETE) |
| Patient endpoints | No | /api/patients (POST/GET/PUT) |

### 5.2 Prediction Service (:8002)

**Mejoras:**

| Característica | Antes | Después |
|----------------|-------|---------|
| Persistencia | Básica | user_id tracking |
| Modelos | mortality_risk solo | + length_of_stay, + readmission_risk |
| Explicabilidad | No | SHAP, LIME, Gradientes Integrados, Mapas de Saliencia |
| Narrativa | No | 4 proveedores: stub, local, gemini, huggingface |
| Enrutamiento | Solo /predictions | + /prediction, /prediccion (alias español) |

### 5.3 Simulation Service (:8003)

**Mejoras:**

| Característica | Antes | Después |
|----------------|-------|---------|
| Persistencia | Básica | user_id tracking |
| Escenarios | 3 | 4 (+ icu_patient_simulation) |
| Estadísticas | No | + Wilcoxon, + Friedman |
| Fallback | No documentado | SHA-256 determinista documentado |

---

## 6. Infraestructura Docker

### 6.1 Evolución de Contenedores

| Contenedor | Antes | Después |
|------------|-------|---------|
| api-gateway | ✓ | ✓ (mejorado) |
| prediction | ✓ | ✓ (mejorado) |
| prediction-db | ✓ | ✓ |
| simulation | ✓ | ✓ (mejorado) |
| simulation-db | ✓ | ✓ |
| user | ✗ | ✓ (NUEVO) |
| user-db | ✗ | ✓ (NUEVO) |
| patient | ✗ | ✓ (NUEVO) |
| patient-db | ✗ | ✓ (NUEVO) |
| **Total** | **5** | **8** |

### 6.2 Red

```
Antes: api-gateway, prediction, prediction-db, simulation, simulation-db

Después: api-gateway, prediction, prediction-db, simulation, simulation-db,
         user, user-db, patient, patient-db
```

Todos los servicios comparten la red `saduci-network` (tipo bridge).

---

## 7. Shared (Componentes Compartidos)

### 7.1 Esquemas Pydantic

| Schema | Antes | Después |
|--------|-------|---------|
| health.py | ✓ | ✓ |
| user.py | ✗ | ✓ (NUEVO) |
| patient.py | ✗ | ✓ (NUEVO) |
| prediction.py | ✓ | ✓ (expandido) |
| simulation.py | ✓ | ✓ (expandido) |
| statistics.py | ✗ | ✓ (NUEVO) |

### 7.2 Utilidades

| Utilidad | Antes | Después |
|----------|-------|---------|
| auth.py (JWT + passwords) | ✓ | ✓ (mejorado) |
| logger.py | ✓ | ✓ |
| http_client.py | ✗ | ✓ (NUEVO - ServiceClient) |

---

## 8. Resumen de la Evolución

### Línea de Tiempo

```
Versión 1.0.0 (2024-01-15):
  - 3 servicios básicos
  - Autenticación demo
  - Modelo dummy de predicción

Versión 1.1.0 (2026-03-03):
  - SimUCI integration
  - Tests: 31 → 137
  - Fallback determinista

Versión 1.2.0 (2026-03-16):
  - Documentación consolidada
  - Health checks
  - Arquitectura estable

Versión 1.3.0 (Actual - 2026-06):
  - +User Service con roles y permisos
  - +Patient Service
  - CRUD completo de usuarios
  - Rate limiting
  - Tracking de usuario en operaciones
  - 324 tests unitarios
```

### Beneficios Cuantitativos

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Número de servicios | 3 | 5 | +66% |
| Bases de datos | 2 | 4 | +100% |
| Roles de usuario | 1 (superuser) | 3 (ADMIN/ESPECIALISTA/MEDICO) | +200% |
| Endpoints de usuario | 3 (/admin/users) | 8 (/api/users + /admin/users + auth) | +166% |
| Endpoints totales | ~15 | ~30 | +100% |
| Contenedores Docker | 5 | 8 | +60% |
| Tests unitarios | 137 | 324 | +136% |

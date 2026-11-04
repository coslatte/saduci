# API Endpoints - SADUCI

Base URL (desarrollo): `http://localhost:7000` (API Gateway). Todos los endpoints
de dominio se consumen a través del gateway; los servicios internos (7001-7004)
no se exponen públicamente.

## API Gateway (Puerto principal)

### Health
- `GET /health` - Health check

### Autenticación
- `POST /auth/login` - Inicio de sesión (rate-limited: 5 intentos/60s)
- `POST /auth/register` - Registro público de usuario (rol MEDICO)
- `GET /auth/me` - Obtener usuario actual (JWT)
- `POST /auth/change-password` - Cambiar contraseña (JWT)
- `PUT /api/user/profile` - Actualizar perfil propio (JWT)

### Gestión de Usuarios
- `POST /api/users` - Crear usuario (ADMIN)
- `GET /api/users` - Listar usuarios con filtro `?role=` (ADMIN)
- `GET /api/users/{user_id}` - Obtener usuario (JWT)
- `PUT /api/users/{user_id}` - Actualizar usuario (ADMIN)
- `DELETE /api/users/{user_id}` - Eliminar usuario (ADMIN)
- `GET /admin/users` - Listar todos los usuarios (SUPERUSER)
- `POST /admin/users` - Crear usuario (SUPERUSER)
- `PUT /admin/users/{user_id}` - Actualizar `username`, `email`, `role` y/o `is_active` (SUPERUSER)
- `DELETE /admin/users/{user_id}` - Eliminar usuario, sin autoborrado (SUPERUSER)

### Pacientes
- `POST /api/patients` - Crear paciente (ADMIN/ESPECIALISTA)
- `GET /api/patients/{mrn}` - Obtener paciente (JWT)
- `PUT /api/patients/{mrn}` - Actualizar paciente (ADMIN/ESPECIALISTA)

### Predicciones
- `POST /api/predictions` - Crear predicción (ADMIN/ESPECIALISTA)
- `GET /api/predictions` - Listar predicciones (JWT)
- `GET /api/predictions/count` - Total de predicciones (JWT)
- `GET /api/predictions/models` - Listar modelos disponibles (JWT)
- `GET /api/predictions/{patient_id}` - Historial por paciente (JWT)
- `PUT /api/predictions/{prediction_id}` - Actualizar registro (ADMIN/ESPECIALISTA)
- `DELETE /api/predictions/{prediction_id}` - Eliminar registro (ADMIN/ESPECIALISTA)
- `POST /prediction` - Predicción de plataforma (público)
- `POST /prediction/explain` - Explicación de predicción (público)
- `POST /prediccion` - Alias español de `/prediction` (público)
- `POST /prediccion/explain` - Alias español de `/prediction/explain` (público)

### Simulaciones
- `POST /api/simulations` - Crear simulación (ADMIN/ESPECIALISTA)
- `GET /api/simulations` - Listar simulaciones (JWT)
- `GET /api/simulations/count` - Total de simulaciones (JWT)
- `GET /api/simulations/scenarios` - Listar escenarios (JWT)
- `GET /api/simulations/{patient_id}` - Historial por paciente (JWT)
- `PUT /api/simulations/{simulation_id}` - Actualizar registro (ADMIN/ESPECIALISTA)
- `DELETE /api/simulations/{simulation_id}` - Eliminar registro (ADMIN)
- `POST /api/simulations/icu` - Simulación de paciente UCI (ADMIN/ESPECIALISTA)
- `POST /simulation` - Simulación de plataforma (público)

### Estadísticas
- `POST /statistics/wilcoxon` - Test de Wilcoxon (público)
- `POST /statistics/friedman` - Test de Friedman (público)
- `GET /api/statistical-tests` - Listar resultados persistidos (JWT)
- `POST /api/statistical-tests` - Crear resultado (ADMIN/ESPECIALISTA)
- `PUT /api/statistical-tests/{test_id}` - Actualizar resultado (ADMIN/ESPECIALISTA)
- `DELETE /api/statistical-tests/{test_id}` - Eliminar resultado (ADMIN/ESPECIALISTA)

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
- `GET /api/predictions/{patient_id}`, `PUT /api/predictions/{id}`, `DELETE /api/predictions/{id}`

## Simulation Service (:7004)

- `GET /health`, `POST /simulation`
- `POST /api/simulations`, `GET /api/simulations`, `GET /api/simulations/count`
- `GET /api/simulations/scenarios`, `GET /api/simulations/{patient_id}`
- `PUT /api/simulations/{id}`, `DELETE /api/simulations/{id}`, `POST /api/simulations/icu`
- `POST /statistics/wilcoxon`, `POST /statistics/friedman`
- `GET /api/statistical-tests`, `POST /api/statistical-tests`
- `PUT /api/statistical-tests/{id}`, `DELETE /api/statistical-tests/{id}`

## User Service (:7001)

- `GET /health`, `POST /auth/login`, `POST /auth/register`
- `POST /auth/change-password` (el gateway pasa `user_id` como query)
- `PUT /api/user/profile`
- `POST /api/users`, `GET /api/users`, `GET /api/users/{id}`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`
- `GET /admin/users`, `GET /admin/users/{id}`, `PUT /admin/users/{id}/role`

## Patient Service (:7002)

- `GET /health`, `POST /api/patients`, `GET /api/patients/{mrn}`, `PUT /api/patients/{mrn}`

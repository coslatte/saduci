# Módulo de Usuarios — SADUCI

## 1. Visión General

El módulo de usuarios de SADUCI implementa un sistema completo de gestión de identidades y control de acceso basado en roles (RBAC). Este módulo fue añadido en la etapa final del desarrollo para garantizar que solo personal autorizado pueda acceder a funcionalidades críticas como creación de predicciones, ejecución de simulaciones y administración del sistema.

---

## 2. Modelo de Datos

### 2.1 User Service (Microservicio Independiente)

El módulo de usuarios opera como un microservicio independiente (`User Service :8004`) con su propia base de datos PostgreSQL (`user-db`). Esto sigue el patrón Database per Service, desacoplando la gestión de identidades del resto de dominios.

### 2.2 Tabla `users`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | Integer | PK, auto-increment | Identificador único |
| `username` | String(150) | UNIQUE, NOT NULL | Nombre de usuario |
| `email` | String(255) | UNIQUE, NOT NULL | Correo electrónico |
| `hashed_password` | String(255) | NOT NULL | Hash pbkdf2_sha256 |
| `role` | String(50) | NOT NULL, default: MEDICO | Rol asignado |
| `is_active` | Boolean | NOT NULL, default: true | Estado de la cuenta |
| `created_at` | DateTime(tz) | NOT NULL | Fecha de creación |
| `updated_at` | DateTime(tz) | NOT NULL | Última actualización |

---

## 3. Roles y Jerarquía

### 3.1 UserRole Enum

```python
class UserRole(str, Enum):
    ADMIN = "ADMIN"           # Acceso total al sistema
    ESPECIALISTA = "ESPECIALISTA"  # Operaciones clínicas avanzadas
    MEDICO = "MEDICO"         # Consulta básica (rol por defecto)
```

### 3.2 Matriz de Permisos

| Recurso / Acción | ADMIN | ESPECIALISTA | MEDICO |
|-----------------|-------|-------------|--------|
| **Usuarios** | | | |
| Crear usuarios | ✓ | ✗ | ✗ |
| Listar usuarios | ✓ | ✗ | ✗ |
| Editar usuarios | ✓ | ✗ | ✗ |
| Eliminar usuarios | ✓ | ✗ | ✗ |
| **Pacientes** | | | |
| Crear paciente | ✓ | ✓ | ✗ |
| Ver paciente | ✓ | ✓ | ✓ |
| Actualizar paciente | ✓ | ✓ | ✗ |
| **Predicciones** | | | |
| Crear predicción | ✓ | ✓ | ✗ |
| Ver predicciones | ✓ | ✓ | ✓ |
| Ver modelos | ✓ | ✓ | ✓ |
| **Simulaciones** | | | |
| Crear simulación | ✓ | ✓ | ✗ |
| Ver simulaciones | ✓ | ✓ | ✓ |
| Simulación UCI | ✓ | ✓ | ✗ |
| **Estadísticas** | | | |
| Wilcoxon / Friedman | ✓ | ✓ | ✗ |

### 3.3 Permisos en Frontend

El frontend implementa permisos visuales mediante `recordPermissions.ts`:

| Recurso | Administrador | Especialista | Médico |
|---------|--------------|-------------|--------|
| Simulaciones | CRUD completo | Crear, editar, ver (no eliminar) | Solo lectura |
| Predicciones | CRUD completo | CRUD completo | Solo lectura |
| Estadísticas | CRUD completo | CRUD completo | Solo lectura |

---

## 4. Autenticación JWT

### 4.1 Flujo de Autenticación

```
1. Cliente → POST /auth/login { username, password }
2. Gateway → verifica rate limit (5 req/60s/IP)
3. Gateway → User Service → autenticar credenciales
4. User Service → devuelve UserResponse (con role)
5. Gateway → genera JWT con claims:
   {
     "sub": username,
     "uid": user_id,
     "email": email,
     "role": "ADMIN|ESPECIALISTA|MEDICO",
     "is_superuser": bool,
     "exp": expiration (30 min default)
   }
6. Gateway → LoginResponse { access_token, user }
7. Cliente → almacena token en localStorage (saduci_token)
8. Cliente → incluye "Authorization: Bearer <token>" en peticiones
```

### 4.2 Claims del JWT

| Claim | Descripción | Ejemplo |
|-------|-------------|---------|
| `sub` | Nombre de usuario | "admin" |
| `uid` | ID numérico del usuario | 1 |
| `email` | Correo electrónico | "admin@saduci.com" |
| `role` | Rol como string | "ADMIN" |
| `is_superuser` | Booleano (true para ADMIN) | true |
| `exp` | Timestamp de expiración | 1719000000 |

### 4.3 Dependencias de Autorización (FastAPI)

```python
# Cualquier usuario autenticado
get_current_user → extrae TokenUser del JWT

# Solo ADMIN
require_admin → current_user.role == UserRole.ADMIN

# Solo superusuarios
require_superuser → is_superuser == True

# ADMIN o ESPECIALISTA
require_especialista_or_admin → role in (ADMIN, ESPECIALISTA)
```

---

## 5. Gestión de Usuarios (CRUD)

### 5.1 Endpoints de Usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/users` | ADMIN | Crear usuario con rol específico |
| GET | `/api/users` | ADMIN | Listar usuarios (filtro `?role=`) |
| GET | `/api/users/{id}` | Cualquiera | Obtener usuario por ID |
| PUT | `/api/users/{id}` | ADMIN | Actualizar email, rol, estado |
| DELETE | `/api/users/{id}` | ADMIN | Eliminar usuario |
| GET | `/admin/users` | SUPERUSER | Listar todos los usuarios |
| POST | `/admin/users` | SUPERUSER | Crear usuario admin |
| DELETE | `/admin/users/{id}` | SUPERUSER | Eliminar usuario (sin autoborrado) |

### 5.2 Validaciones

- **Contraseña:** Mínimo 8 caracteres
- **Email:** Único en el sistema, formato email válido
- **Username:** Único en el sistema, case-insensitive
- **Rol:** Debe ser uno de: ADMIN, ESPECIALISTA, MEDICO
- **Autoborrado:** Un administrador no puede eliminarse a sí mismo

### 5.3 Política de Contraseñas

- Hash: `pbkdf2_sha256` (via passlib)
- Longitud mínima: 8 caracteres
- Las contraseñas NUNCA se devuelven en respuestas API
- El cambio de contraseña requiere verificar la contraseña actual

---

## 6. Seed Data

Cuando el User Service inicia y la tabla `users` está vacía, se crean automáticamente:

| Username | Email | Contraseña | Rol |
|----------|-------|------------|-----|
| `{AUTH_USERNAME}` | `{AUTH_USERNAME}@saduci.com` | `{AUTH_PASSWORD}` | ADMIN |
| `analista1` | `analista1@saduci.com` | `password123` | ESPECIALISTA |
| `analista2` | `analista2@saduci.com` | `password123` | ESPECIALISTA |
| `doctor` | `doctor@saduci.com` | `doctor123` | MEDICO |

El usuario admin inicial se configura mediante variables de entorno (`AUTH_USERNAME`, `AUTH_PASSWORD`).

---

## 7. Tracking de Usuario en Operaciones

SADUCI implementa tracking de usuario en las operaciones clínicas para auditoría:

1. El API Gateway extrae el `uid` del JWT
2. Gateway añade headers a la petición proxy:
   - `X-User-ID`: ID del usuario autenticado
   - `X-User-Role`: Rol del usuario
   - `X-User-Username`: Nombre de usuario
3. Los servicios internos almacenan `user_id` en las tablas `predictions` y `simulations`

Esto permite:
- Auditar quién creó cada predicción o simulación
- Filtrar historiales por usuario
- Mantener trazabilidad de operaciones clínicas

---

## 8. Implementación Frontend

### 8.1 AuthContext (`src/lib/auth.tsx`)

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;
  // Métodos:
  login(identifier: string, password: string): Promise<void>;
  register(email: string, username: string, password: string, role: string): Promise<void>;
  logout(): void;
  updateUserAvatar(avatar: string): void;
}
```

### 8.2 Almacenamiento

- Token JWT → `localStorage.setItem("saduci_token", token)`
- Datos de usuario → `localStorage.setItem("saduci_user", JSON.stringify(user))`
- Hydration: al montar la app, se valida el token existente via `GET /auth/me`

### 8.3 Normalización de Roles

El frontend normaliza roles del backend para visualización:

| Rol Backend | Rol Frontend |
|-------------|-------------|
| `ADMIN` | `"Administrador"` (isSuperuser: true) |
| `ESPECIALISTA` | `"Especialista"` |
| `MEDICO` | `"Médico"` |

### 8.4 Protección de Rutas

- `ShellController.tsx`: Wrapper que redirige a `/login` si no hay autenticación
- `isAdmin()`: Guard para rutas `/admin/*`, redirige a `/` si no es admin
- Admin UI sections ocultas para usuarios no administradores

### 8.5 Página de Administración de Usuarios

La página `/admin/users` permite:
- Visualizar todos los usuarios con badges de rol y estado
- Crear nuevos usuarios con formulario inline
- Eliminar usuarios (con confirmación, sin autoborrado)
- Interfaz protegida: solo accesible por administradores

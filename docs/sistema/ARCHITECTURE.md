# SADUCI — Arquitectura unificada

SADUCI es un sistema de apoyo a la decisión clínica en UCI. Vive en un **monorepo**
con dos aplicaciones y una capa de infraestructura compartida. El backend sigue
siendo un conjunto de **microservicios con Database per Service**; el monorepo no
implica monolito.

```
saduci/                              # raíz del monorepo (un solo repo git)
├── apps/
│   ├── core/                        # backend FastAPI
│   │   ├── src/api-gateway/         # :7000  JWT + rate limit + proxy (sin DB)
│   │   ├── src/user/                # :7001  user_db
│   │   ├── src/patient/             # :7002  patient_db (async)
│   │   ├── src/prediction/          # :7003  prediction_db + models/v1/new_workflow.joblib
│   │   ├── src/simulation/          # :7004  simulation_db + app/data/centroids.csv
│   │   ├── src/shared_core/         # contratos + seguridad + utils compartidos
│   │   ├── tests/                   # pytest, un subprocess por servicio
│   │   ├── compose.yaml             # 5 servicios + 4 PostgreSQL (+ perfil platform)
│   │   └── .env.example             # variables de la pila
│   └── platform/                    # frontend Next.js 16 + React 19 + Bun
│       ├── src/app/                 # App Router + route handlers /api/*
│       ├── src/components/          # atomic design
│       ├── src/lib/                 # auth, recordsApi, apiProxy, ...
│       └── src/constants/           # literales visibles centralizados
├── scripts/
│   ├── saduci.py                    # orquestador local (único punto de entrada)
│   └── fix_db_permissions.py        # reparación de permisos del schema public
├── logs/                            # salida de los procesos (no se versiona)
├── docs/sistema/                    # documentación técnica del sistema
├── docs/tesis/                      # escribos y diagramas de la tesis
├── Makefile                         # atajos unificados
└── README.md
```

## 1) Principios firmes

1. **Monorepo, no monolito.** Cada microservicio conserva su carpeta, su
   `Dockerfile`, su `requirements.txt` y su base de datos. Se puede construir y
   desplegar por separado.
2. **Una sola frontera de red.** El frontend nunca llama a los servicios
   internos; consume el API Gateway en `API_URL`. Los puertos 7001-7004 solo se
   publican en `127.0.0.1` del host.
3. **Contratos en un solo lugar.** `apps/core/src/shared_core/schemas/` es la
   fuente de verdad de los contratos; el gateway expone `/openapi.json`.
4. **Contexto de build por servicio.** Cada `Dockerfile` se construye con el
   contexto de su propia carpeta bajo `apps/core/src/<servicio>/`.
5. **Configuración separada por plano.** `apps/core/.env` para la pila completa;
   `apps/platform/.env.local` para el frontend en desarrollo.
6. **Documentación canónica en `docs/sistema/`.** Sin documentación duplicada.

## 2) Topología de servicios

| Servicio | Puerto | Base de datos | Responsabilidad |
|----------|--------|---------------|-----------------|
| API Gateway | 7000 | — | JWT, rate limiting, proxy, CORS |
| User Service | 7001 | user-db | Autenticación, CRUD de usuarios, roles |
| Patient Service | 7002 | patient-db | Registro clínico de pacientes |
| Prediction Service | 7003 | prediction-db | Inferencia ML y explicabilidad |
| Simulation Service | 7004 | simulation-db | Simulación ICU y pruebas estadísticas |

```text
Navegador
    |
    v
saduci-platform (Next.js)  --/api/*-->  Route Handlers (server-side)
    |                                        |
    |                                        v
    +------------------------------> API Gateway :7000
                                         |-- /api/users, /auth/*  --> User :7001       --> user-db
                                         |-- /api/patients/*      --> Patient :7002    --> patient-db
                                         |-- /api/predictions*    --> Prediction :7003 --> prediction-db
                                         |-- /api/simulations*    --> Simulation :7004 --> simulation-db
```

## 3) Estructura interna de cada servicio

Cada microservicio es un paquete raíz independiente bajo `src/` que expone
`app.main:app`; el código se organiza en `app/` por capas, para que los imports
no colisionen entre servicios en el mismo proceso de pytest:

```text
src/<service>/
├── app/
│   ├── main.py       # entrada Docker/uvicorn; expone app.main:app
│   ├── api/          # routers FastAPI
│   ├── services/     # lógica de negocio
│   ├── repositories/ # persistencia
│   ├── models/       # engine y entidades SQLAlchemy
│   └── schemas/      # contratos Pydantic del servicio
├── Dockerfile
└── pyproject.toml
```

El flujo de dependencias es `api → services → repositories → models`. El kernel
`shared_core` vive una sola vez en `src/shared_core/`; los servicios lo consumen
como dependencia del workspace `uv` y, en Docker, cada `Dockerfile` lo copia
desde el contexto de build `apps/core`.

`api-gateway` no tiene base de datos: usa `app/controllers/` (auth, proxy,
config) y `app/websocket/manager.py`. El artefacto ML de prediction vive en
`src/prediction/models/v1/`, no en `app/`.

## 4) Modelo de roles

| Recurso | ADMIN | ESPECIALISTA | MEDICO |
|---------|-------|--------------|--------|
| CRUD usuarios | ✓ | ✗ | ✗ |
| Crear predicción / simulación | ✓ | ✓ | ✗ |
| Ver predicciones / simulaciones | ✓ | ✓ | ✓ |
| Eliminar simulaciones | ✓ | ✗ | ✗ |
| Editar/eliminar predicciones y estadísticas | ✓ | ✓ | ✗ |
| Pruebas estadísticas | ✓ | ✓ | ✗ |

Claims del JWT: `sub`, `uid`, `email`, `role`, `is_superuser`, `exp`.
El gateway reenvía `X-User-ID`, `X-User-Role` y `X-User-Username` a los servicios
internos para el tracking de `user_id`/`created_by`.

## 5) Modelo de datos (Database per Service)

| Base de datos | Tablas |
|---------------|--------|
| `user-db` | `users` (id, username, email, hashed_password, role, is_active, avatar, created_at, updated_at) |
| `patient-db` | `patients` (id, mrn, first_name, last_name, date_of_birth, sex, created_at, updated_at) |
| `prediction-db` | `predictions` (id, patient_id, model_name, features, prediction, confidence, user_id, created_by, created_at) |
| `simulation-db` | `simulations` (id, patient_id, scenario, parameters, results, user_id, created_by, created_at); `statistical_tests` (id, test_type, variable, statistic, p_value, interpretation, user_id, created_by, created_at) |

No hay claves foráneas entre bases: la relación `user_id` se resuelve a nivel de
aplicación mediante los headers de tracking.

## 6) Frontend en ejecución (`apps/platform`)

La frontera navegador-backend está en los Route Handlers de Next.js. El navegador
usa rutas del mismo origen; Next reenvía esas solicitudes al API Gateway en
`:7000`. Los servicios internos no se llaman desde componentes cliente.

```text
Client Component
  → cliente de dominio en src/lib/* o apiFetch
    → Route Handler /api/* (BFF)
      → resolveCoreApiUrl() / API_URL
        → API Gateway :7000
          → user | patient | prediction | simulation
```

Estructura relevante:

- `src/app/`: páginas App Router y Route Handlers `/api/*`.
- `src/proxy.ts`: autenticación y redirecciones de páginas; no intercepta `/api/*`.
- `src/components/`: componentes compartidos (`atoms`, `molecules`, `organisms`, `layout`).
- `src/app/<dominio>/components/`: componentes propios de las páginas de dominio.
- `src/lib/`: `http.ts` para llamadas del navegador, `apiProxy.ts` para upstreams BFF, y clientes/adaptadores de datos.
- `src/features/` y `src/entities/`: módulos y tipos de dominio.
- `src/test/`: pruebas unitarias y de interacción.

Las pantallas revisadas usan estado local y clientes de `src/lib/`. También hay
`server-api.ts`, `useFormWithAction` y dependencias de React Query, pero no forman
parte del flujo activo de esas pantallas. Evita documentarlos como camino
principal o introducirlos en una ruta sin migrar un flujo completo.

**Sesión:** el BFF y `src/proxy.ts` leen la cookie `httpOnly`. El cliente también
refleja el token en `localStorage` para algunos adaptadores que envían
`Authorization`; mantener presente esa duplicación al cambiar autenticación.

**Invariantes de integración:**

1. El cliente llama a `/api/*`; solo el BFF resuelve `API_URL` y contacta al gateway.
2. El gateway de desarrollo escucha en `http://localhost:7000`; `API_URL` local debe usar ese puerto.
3. El cliente no debe recibir URLs de servicios internos ni un `API_URL` con hostname de Compose.

## 7) Ejecución

Ver [DEPLOY.md](DEPLOY.md) para el procedimiento completo, la
operación y el diagnóstico de fallos.

### Backend + bases (Docker)

```bash
cp apps/core/.env.example apps/core/.env      # completar secretos
docker compose -f apps/core/compose.yaml up -d --build
```

### Pila completa (incluye el frontend en contenedor)

```bash
docker compose -f apps/core/compose.yaml --profile platform up -d --build
```

### Frontend en desarrollo

```bash
cd apps/platform
cp .env.example .env.local            # API_URL=http://localhost:7000
bun install
bun run dev                           # http://localhost:4000
```

### Backend en local (sin Docker)

```bash
python scripts/saduci.py up backend   # gateway + 4 microservicios (desde la raíz)
python scripts/saduci.py test         # suite de pruebas (un subprocess por servicio)
```

## 8) Calidad

| App | Lint | Tipos | Tests |
|-----|------|-------|-------|
| `apps/core` | `uv run ruff check .` | — | `python scripts/saduci.py test` |
| `apps/platform` | `bun run lint` | `bunx tsc --noEmit` | `bun test` |

CI: `.github/workflows/ci.yml` ejecuta ambos conjuntos con *path filters*.

## 9) Decisiones y límites conocidos

- Alembic no está configurado: los servicios crean sus tablas con
  `Base.metadata.create_all` y migraciones ligeras `ADD COLUMN IF NOT EXISTS`.
- `POST /api/internal/event` y `/ws/events` no están autenticados.
- `POST /simulations/icu` requiere `apps/core/src/simulation/data/centroids.csv`
  (ausente); sin él cae al fallback determinista en `/simulation`.
- El token JWT no tiene refresh; al expirar, el frontend cierra sesión.

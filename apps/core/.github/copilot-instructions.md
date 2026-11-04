# GitHub Copilot Instructions — SADUCI-Core

Backend de microservicios FastAPI para apoyo a la decisión clínica en UCI.
Python 3.13, PostgreSQL 16.3, `uv`. La arquitectura canónica es
`docs/sistema/ARCHITECTURE.md`; este archivo resume las reglas operativas del
backend.

## Servicios y puertos

| Servicio | Puerto | Base de datos | Responsabilidad |
|----------|--------|---------------|-----------------|
| `src/api-gateway` | 7000 | — | JWT, autorización por rol, rate limit, proxy, CORS, WebSocket de eventos |
| `src/user` | 7001 | `user_db` | Autenticación, CRUD de usuarios, roles |
| `src/patient` | 7002 | `patient_db` | Registro clínico de pacientes (async) |
| `src/prediction` | 7003 | `prediction_db` | Inferencia ML, explicabilidad, narrativa clínica |
| `src/simulation` | 7004 | `simulation_db` | Simulación clínica (SimUCI + fallback) |

Los puertos 7001-7004 solo se publican en `127.0.0.1`; el frontend consume
únicamente el gateway en `API_URL`. El gateway reenvía `X-User-ID`,
`X-User-Role` y `X-User-Username` a los servicios internos.

## Patrones de código

- FastAPI en todos los servicios; contratos Pydantic en
  `src/shared_core/schemas/`.
- Autenticación JWT centralizada en el API Gateway
  (`src/api-gateway/app/controllers/auth.py`); el gateway traduce los errores de
  upstream a 502/504 y extrae el `detail` real (`app/controllers/proxy.py`).
- Cada servicio expone `app.main:app` y organiza el código en MVC:
  `app/api/` → `app/services/` → `app/repositories/` → `app/models/`.
- Database per Service: sin claves foráneas entre bases; `user_id`/`created_by`
  se resuelven con los headers de tracking.
- **Migraciones con Alembic.** Cada servicio con base de datos trae
  `alembic.ini` y `migrations/`; el esquema se aplica con `alembic upgrade head`
  antes de arrancar (CMD de Docker y `saduci.py up`). No se usa `create_all` ni
  `ADD COLUMN` ad-hoc.
- El servicio `patient` usa `create_async_engine` (`+asyncpg`); el resto usa
  `create_engine` (`+psycopg2`).
- Health check por servicio; logging estructurado con el logger de
  `shared_core`.
- Convenciones REST y códigos de estado explícitos.

## `shared_core`

El kernel compartido vive una sola vez en `src/shared_core/`. Los servicios lo
declaran como dependencia del workspace (`shared-core = { workspace = true }`);
en Docker el contexto de build es `apps/core` y cada `Dockerfile` copia
`src/shared_core`. No hay copias por servicio ni sincronización manual.

## Entorno y versionado (para agentes)

- Usar `uv` como gestor de versiones y runner. Invocar Python y pip a través de
  `uv` (`uv run -m pytest`, `uv pip install ...`), nunca el Python del sistema.
- Un único entorno virtual: `.venv`. No crear otros.
- Python 3.13 fijo (`requires-python = ">=3.13"`).
- No instalar paquetes globalmente.

## Estructura

- Servicios en `src/<servicio>/`, cada uno con su `app/`, `Dockerfile` y
  `pyproject.toml`.
- Código compartido en `src/shared_core/`.
- `compose.yaml` y `.env.example` son la configuración de la pila; los tests van
  en `tests/`.
- Sin carpetas `docs/` locales: la documentación vive en `docs/sistema/`.

## Estilo y lint

- `ruff` con `line-length = 100`, `target-version = "py313"`,
  `select = ["E", "F", "W"]`, `ignore = ["E402", "E501"]` (config en
  `apps/core/pyproject.toml`). Ejecutar `uv run ruff check .`.
- Type hints en funciones públicas, nombres descriptivos, funciones pequeñas.
- Docstrings solo donde aportan; evitar comentarios que repitan el código.
- Imports: stdlib, terceros, locales. Se permiten imports relativos dentro de
  `src/shared_core/` para reexportar en `__init__.py`.

## Testing

- La suite vive en `tests/` y se orquesta con `tests/run_tests.py`: un
  subprocess de pytest por servicio, porque cada servicio es un paquete raíz
  `app` independiente. Comando oficial: `python scripts/saduci.py test`.
- `run_tests.py` fija `SECRET_KEY`, `AUTH_USERNAME/PASSWORD`, `NO_PROXY` y una
  `DATABASE_URL` SQLite por suite: ningún test toca la red ni las bases reales.
- Cubrir endpoints de health, autenticación JWT, CRUD y la integración SimUCI.
- Los tests son contratos: si cambia un schema en `shared_core/schemas/`,
  actualizar el test y el mock del frontend en el mismo commit.

## Seguridad

- Nunca commitear secretos ni contraseñas por defecto.
- Configuración por variables de entorno (`pydantic-settings`); mantener los
  `.env.example` al día.
- Validar entradas en los límites (Pydantic) y configurar CORS de forma
  explícita.

## Documentación

- Canónica en `docs/sistema/`: `CHANGELOG.md`, `ARCHITECTURE.md`,
  `API_ENDPOINTS.md`, `RUNNING.md`, `DEPLOY.md`. Registrar cambios técnicos en
  `CHANGELOG.md` y mantener `ARCHITECTURE.md` alineado con el comportamiento
  real.
- Si cambia la superficie del gateway, actualizar `docs/sistema/API_ENDPOINTS.md`.
- Detalle en `apps/core/.agents/skills/documentation-policy/SKILL.md`.

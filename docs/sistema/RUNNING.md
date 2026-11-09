# SADUCI — Cómo levantar el sistema

## Lo normal: cada aplicación por su cuenta

El backend y el frontend se levantan por separado, cada uno desde su directorio.
Esta es la forma recomendada en desarrollo.

```bash
# Terminal 1 — backend y bases de datos
cd apps/core
cp .env.example .env      # solo la primera vez
docker compose up --build
```

```bash
# Terminal 2 — frontend
cd apps/platform
bun install               # solo la primera vez
cp .env.example .env.local # API_URL=http://localhost:7000
bun run dev
```

`docker compose up` desde `apps/core` levanta el API Gateway, los 4
microservicios y sus 4 bases de datos. **No** levanta el frontend: su ciclo de
vida es independiente, así se ven sus logs y su recarga en caliente en primera
persona.

### URLs

| Servicio | URL |
|---|---|
| Frontend | http://localhost:4000 |
| API Gateway (docs `/docs`) | http://localhost:7000 |
| User | http://localhost:7001 |
| Patient | http://localhost:7002 |
| Prediction | http://localhost:7003 |
| Simulation | http://localhost:7004 |

**Login:** el orquestador local usa `admin` / `changeme`. Con Docker Compose,
usa los valores de `AUTH_USERNAME` y `AUTH_PASSWORD` en `apps/core/.env`.

Para detener el backend: `Ctrl+C` en su terminal, o `docker compose down`
(desde `apps/core`). `down` conserva los volúmenes; `down -v` borra las bases.

## El orquestador: todo junto, sin Docker

`scripts/saduci.py` levanta y valida el sistema entero corriendo los servicios
con Python y `bun`. Es útil para una validación de arranque de extremo a
extremo, o cuando quieres ver el flujo completo de una vez.

```bash
python scripts/saduci.py up                # primer plano, logs en vivo
python scripts/saduci.py up --detach       # segundo plano
python scripts/saduci.py up backend        # solo el backend
python scripts/saduci.py up platform       # solo el frontend
python scripts/saduci.py down              # detener
```

### Los logs en la terminal

Por defecto `up` queda en **primer plano**: muestra el arranque paso a paso
(preflight, bases de datos, lanzamiento,
validación end-to-end) y, al terminar, la terminal se convierte en un
multiplexor: cada línea aparece etiquetada con el servicio que la emitió.

```
user          | INFO:     Application startup complete.
api-gateway   | INFO:     Uvicorn running on http://0.0.0.0:7000
frontend      |  ▲ Next.js 16.1.6
frontend      |  - Local:        http://localhost:4000
```

`Ctrl+C` detiene solo lo que lanzó este script. Los logs se siguen escribiendo
en `logs\<servicio>.log`.

Con `--detach` el script devuelve el control y los servicios siguen corriendo.
Para recuperar los logs:

```bash
python scripts/saduci.py logs             # últimas líneas de cada log
python scripts/saduci.py logs --follow    # seguir todos en vivo, con etiqueta
```

### Otros comandos

```bash
python scripts/saduci.py check           # solo verifica, no toca nada
python scripts/saduci.py test            # suite de tests del backend
python scripts/saduci.py test user       # solo la suite de un servicio
python scripts/saduci.py dbfix           # permisos del schema public
python scripts/saduci.py secrets         # genera secretos reales en apps/core/.env
python scripts/saduci.py deploy-check    # valida compose.yaml contra el código
```

Atajos: `make up`, `make up-detach`, `make logs-follow`, `make down`.

## Modelo local para explicar predicciones

Compose configura el proveedor `embedded` por defecto para generar una narrativa
local al solicitar la explicación. Si el GGUF no está disponible o no se puede
cargar, el predictor conserva sus resultados y usa una explicación de respaldo.
Los pesos se guardan en el volumen `prediction-narrative-model`; no se descargan
al construir la imagen ni al iniciar el servicio.

Cuando haya ancho de banda disponible, desde la raíz del repositorio:

```bash
docker compose -f apps/core/compose.yaml build prediction-service
docker compose -f apps/core/compose.yaml run --rm --no-deps --entrypoint python prediction-service -m app.services.model_assets
docker compose -f apps/core/compose.yaml restart prediction-service
```

El primer comando puede descargar dependencias para construir la imagen. El
segundo descarga aproximadamente 1,1 GB, comprueba el SHA-256 del archivo y lo
conserva en el volumen. El reinicio carga el modelo en memoria. Esta descarga
es independiente del modelo predictivo `joblib`; la explicación generada debe
interpretarse como una descripción de la sensibilidad del predictor.

El [estudio de viabilidad](ESTUDIO_MODELO_LOCAL.md) recoge las limitaciones
para tres usuarios en un equipo con i3 y 8 GB de RAM y el plan de evaluación.

## Tests

```bash
# Backend: un subprocess por servicio
python scripts/saduci.py test

# Frontend
cd apps/platform && bun test
cd apps/platform && bunx tsc --noEmit
cd apps/platform && bun run lint

# E2E con el frontend y backend levantados. Sobrescribe credenciales si hace falta.
cd apps/platform && E2E_USERNAME=admin E2E_PASSWORD=changeme bun run test:e2e
```

Cada servicio del backend es un paquete raíz `app` independiente, así que la
suite del backend lanza **un subprocess por servicio**
(`apps/core/tests/run_tests.py`); es la única forma de aislarlos.

## Requisitos

**Con Docker (forma recomendada):**

- Docker Desktop o Docker Engine con `docker compose version`

**Con el orquestador (sin Docker):**

- Python 3.13 con `fastapi uvicorn sqlalchemy psycopg2-binary asyncpg httpx pydantic`
- PostgreSQL 16 corriendo como servicio: `net start postgresql-x64-16`
- `bun` (frontend) — el script lo busca en el PATH de WinGet
- `apps/platform/node_modules` (`cd apps/platform && bun install`)

## Si algo falla

```bash
python scripts/saduci.py logs        # causa raíz en logs\<servicio>.log
docker compose -f apps/core/compose.yaml logs <servicio>
```

Problemas típicos:

- **"no se encontraron las bases"** → `python scripts/saduci.py dbfix`
  (necesita el password del superusuario `postgres`)
- **Falta `asyncpg`** → `pip install asyncpg` (lo usa el servicio patient)
- **Puerto ocupado** → `python scripts/saduci.py down` y reintenta
- **Frontend 500** → mira `logs\frontend.log`

## Notas de arquitectura

- **`shared_core` vive una sola vez** en `apps/core/src/shared_core/`. Los
  servicios lo consumen como dependencia del workspace `uv`; en Docker el
  contexto de build es `apps/core` y cada `Dockerfile` lo copia. No hay copias
  por servicio ni sincronización manual.
- **El gateway emite su propio JWT** y revalida contra el user-service; no
  reenvía el token del user-service.
- **La sesión del frontend** viaja en una cookie `httpOnly`. Es la única
  credencial disponible al renderizar en el servidor, y la que leen el
  middleware y las rutas BFF. `localStorage` solo la refleja para que el
  navegador pueda añadir su cabecera `Authorization`.

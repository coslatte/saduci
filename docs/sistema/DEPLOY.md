# Despliegue en un servidor (Docker Compose)

Opción recomendada para que otras PCs usen el sistema: **todo en una sola máquina**.

Solo se exponen el frontend y el gateway. Los 4 microservicios quedan
acotados a `127.0.0.1` y no son accesibles desde la red.

## 1. Requisitos del servidor

- Linux (Ubuntu 22.04+ recomendado) o Windows Server con Docker
- Docker Engine + plugin compose v2 (`docker compose version`)
- 2 vCPU / 4 GB RAM mínimo (el motor de simulación carga modelos)
- Puertos abiertos: `3000` (frontend) y `7000` (API Gateway)

### Instalar Docker

**Linux (Engine, recomendado para servidor):**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # cierra sesión y vuelve a entrar
docker compose version
```

**Windows / macOS (Desktop):**

Instala Docker Desktop desde <https://docs.docker.com/desktop/>. En Windows
pide la característica opcional **Containers**
(*Configuración → Aplicaciones → Funcionales opcionales → Containers*) y
reiniciar; Docker Desktop la instala por ti.

En Windows, si prefieres Engine sin GUI, sobre WSL2:

```powershell
wsl --install -d Ubuntu
wsl --set-default-version 2
winget install -e --id Docker.DockerDesktop
```

## 1.b. Verificar el despliegue antes de tocar el servidor

```bash
python3 scripts/saduci.py deploy-check
```

No necesita Docker. Comprueba la coherencia entre `compose.yaml` y el
código (health endpoints, dialectos de BD, drivers declarados, secretos,
puertos expuestos). Si sale en verde, el stack es coherente.

## 1.c. Construir las imágenes

En Linux, `docker compose up -d --build` funciona directamente. En Windows con
Compose v5.5.1, `docker compose build` falla porque duplica la ruta del
Dockerfile con la unidad del proyecto (`C:\...\proyecto/C:\...\proyecto\Dockerfile`).
Construye con `buildx bake`, que resuelve las rutas bien:

```bash
cd apps/core
docker buildx bake            # construye las 5 imágenes con los tags de Compose
docker compose up -d          # levanta el stack reutilizando esas imágenes
```

`docker-bake.hcl` usa los mismos Dockerfiles y contextos que `compose.yaml`,
incluido el contexto nombrado `core` que aporta `src/shared_core`.

## 2. Preparar el repositorio

```bash
git clone <tu-repo> /opt/saduci
cd /opt/saduci
cp apps/core/.env.example apps/core/.env
```

## 3. Generar secretos reales

```bash
python3 scripts/saduci.py secrets
```

Genera `SECRET_KEY` y los passwords de BD/AUTH con valores aleatorios.
Es idempotente: no cambia los que ya sean seguros. **Nunca subas `apps/core/.env`
al control de versiones.**

## 4. Validar antes de desplegar

```bash
python3 scripts/saduci.py deploy-check
```

Verifica, sin arrancar nada, que:

- cada servicio con healthcheck en compose expone `/health`
- el dialecto de `DATABASE_URL` coincide con el engine del servicio
  (`create_async_engine` → `+asyncpg`; `create_engine` → `psycopg2`)
- el driver está declarado en el `pyproject.toml` del servicio
- no quedan placeholders en los secretos
- solo `platform` y `api-gateway` publican puertos

Debe terminar en `compose.yaml es coherente con el codigo`.
**Si falla, no sigas: el stack no levantará.**

## 5. Levantar

En el servidor se despliega **todo**, incluido el frontend, así que se activa el
perfil `platform` (en desarrollo el frontend corre aparte con `bun run dev`):

```bash
cd apps/core
docker compose --profile platform up -d --build
```

Sin el perfil solo levantarías el backend y las bases de datos, sin interfaz.

## 6. Verificar

```bash
cd apps/core
docker compose --profile platform ps          # todos should be healthy
curl http://localhost:7000/health
curl http://localhost:3000                             # frontend
```

Login real de extremo a extremo (gateway → user-service → Postgres):

```bash
curl -X POST http://localhost:7000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<AUTH_PASSWORD de apps/core/.env>"}'
```

## 7. Actualizar una vez desplegado

```bash
git pull
python3 scripts/saduci.py deploy-check
cd apps/core && docker compose --profile platform up -d --build
```

## 8. Detener / respaldar

```bash
cd apps/core
docker compose --profile platform down            # para
docker compose --profile platform down -v         # para y BORRA las bases
```

Los datos viven en los volúmenes `user-db-data`, `patient-db-data`,
`prediction-db-data`, `simulation-db-data`. Para respaldar, snapshot del
volumen o `pg_dump` de cada Postgres.

## Notas

- **Puertos**: el contenedor del frontend escucha en `3000`. El host es
  configurable con `PLATFORM_HOST_PORT` y `API_GATEWAY_HOST_PORT` en
  `apps/core/.env`. En desarrollo local `saduci.py up` usa `4000` para el
  frontend (puerto de `next dev`); en el servidor usa `3000`. No es un
  conflicto: son entornos distintos.
- **CORS**: ajústalo a los orígenes reales si sirves el frontend y la API en
  dominios distintos (`CORS_ALLOW_ORIGINS` en `apps/core/.env`). El frontend
  proxea por el servidor de Next, así que normalmente basta con el dominio
  del frontend.
- **HTTPS**: pon un proxy inverso (nginx / Caddy) delante de `3000` y `7000`
  para TLS. Compose no termina HTTPS por sí solo.
- **Render se descartó**: exponía los 5 servicios como públicos (los de datos
  quedarían sin autenticación, ya que el JWT lo valida el gateway) y no declara
  Postgres. La ruta soportada es este compose.
- **No verificado con Docker**: en la máquina de desarrollo no había Docker
  (la característica Containers de Windows no está habilitada), así que los
  arreglos se validaron por análisis del compose y del código, **no**
  ejecutando `docker compose up`. La primera ejecución en el servidor es la
  prueba real. Si algún servicio no arranca:
  `docker compose -f apps/core/compose.yaml logs <servicio>`, y comprueba
  que exponga `/health` (los 5 lo hacen).

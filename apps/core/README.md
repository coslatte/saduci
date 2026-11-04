# SADUCI — Backend (`apps/core`)

Microservicios FastAPI para inteligencia clínica en UCI. El compose y su
configuración viven en este directorio; el orquestador está en
`scripts/saduci.py`.

## Servicios

| Servicio | Puerto | Base de datos |
|----------|--------|---------------|
| API Gateway | 7000 | — |
| User Service | 7001 | user-db |
| Patient Service | 7002 | patient-db |
| Prediction Service | 7003 | prediction-db |
| Simulation Service | 7004 | simulation-db |

## Ejecución

Desde este directorio:

```bash
cp .env.example .env        # solo la primera vez
docker compose up --build
```

Eso levanta el gateway, los 4 microservicios y sus 4 bases. **No** levanta el
frontend: en desarrollo corre aparte con `cd ../platform && bun run dev`, para
ver sus logs y su recarga en caliente. El perfil `platform` existe para el
despliegue completo (`docker compose --profile platform up -d --build`).

El User Service siembra el administrador inicial desde `AUTH_USERNAME` /
`AUTH_PASSWORD` la primera vez que arranca `user-db`.

## Desarrollo local

```bash
uv sync                                # crea .venv e instala el workspace
uv run ruff check .                    # lint
python ../../scripts/saduci.py test    # suite: un subprocess por servicio
```

Para levantar el backend sin Docker usa el orquestador desde la raíz:
`python scripts/saduci.py up backend`.

## Documentación

- Ejecución local: [../../docs/sistema/RUNNING.md](../../docs/sistema/RUNNING.md)
- Despliegue: [../../docs/sistema/DEPLOY.md](../../docs/sistema/DEPLOY.md)
- Arquitectura: [../../docs/sistema/ARCHITECTURE.md](../../docs/sistema/ARCHITECTURE.md)
- Contratos de API: [../../docs/sistema/API_ENDPOINTS.md](../../docs/sistema/API_ENDPOINTS.md)
- Changelog: [../../docs/sistema/CHANGELOG.md](../../docs/sistema/CHANGELOG.md)

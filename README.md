# SADUCI-CORE

Microservices core for clinical intelligence (ICU). This README is intentionally short - for full guides, examples, and references see the `docs/` folder.

Quick start — bring up the stack with Docker

Prerequisites: Docker and Docker Compose

Required environment variables for the gateway auth bootstrap:

- `SECRET_KEY`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `API_GATEWAY_DB_PASSWORD`

```bash
git clone https://github.com/coslatte/saduci-core.git
cd saduci-core
docker-compose up -d --build
```

Main endpoints

- API Gateway: <http://localhost:8000>
- Prediction Service: <http://localhost:8002>
- Simulation Service: <http://localhost:8003>

The API Gateway seeds the initial administrator user from `AUTH_USERNAME` / `AUTH_PASSWORD` the first time its database starts. The frontend must authenticate against the gateway before accessing the app.

Local development (optional)

```bash
python -m venv .venv
.venv\Scripts\activate
uv pip install -r services/api-gateway/requirements.txt
uv run services/api-gateway/main.py
```

Detailed documentation in `docs/`

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Changelog: [docs/CHANGELOG.md](docs/CHANGELOG.md)
- Render blueprint: [render.yaml](render.yaml)

Useful commands

```bash
docker-compose up -d --build
docker-compose down
```

# saduci

Microservices core for clinical intelligence (ICU). This README is intentionally short — for full guides, examples, and references see the `docs/` folder.

Quick start — bring up the stack with Docker

Prerequisites: Docker and Docker Compose

```bash
git clone https://github.com/coslatte/saduci-core.git
cd saduci-core
cp .env.example .env
docker-compose up -d --build
```

Main endpoints

- API Gateway: http://localhost:8000
- Patient Service: http://localhost:8001
- Prediction Service: http://localhost:8002
- Simulation Service: http://localhost:8003

Local development (optional)

```bash
python -m venv .venv
.venv\Scripts\activate
uv pip install -r services/api-gateway/requirements.txt
python services/api-gateway/main.py
```

Detailed documentation in `docs/`

- Getting started: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- SimUCI integration: [docs/SIMUCI_INTEGRATION.md](docs/SIMUCI_INTEGRATION.md)

Useful commands

```bash
docker-compose up -d --build
docker-compose down
pytest
```

Want a more minimal README (only commands) or a Spanish version? Tell me which and I'll update it.

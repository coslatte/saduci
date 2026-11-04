# SADUCI - atajos unificados.
#
# Toda la logica de orquestacion local vive en scripts/saduci.py; este Makefile
# solo delega para que puedas usar `make` desde la raiz.
#
# Desarrollo local (sin Docker):  make up
# Despliegue en servidor (Docker): ver docs/sistema/DEPLOY.md

PY      ?= python
SADUCI  := scripts/saduci.py
COMPOSE := docker compose -f apps/core/compose.yaml

.DEFAULT_GOAL := help
.PHONY: help up up-detach up-backend up-platform down check logs logs-follow \
        test build clean secrets deploy-check deploy-up deploy-down

help:
	@echo "SADUCI"
	@echo ""
	@echo "  Desarrollo local (no necesita Docker):"
	@echo "    make up           levanta todo en primer plano; los logs convergen aqui"
	@echo "    make up-detach    lo mismo pero en segundo plano"
	@echo "    make up-backend   solo gateway + microservicios"
	@echo "    make up-platform  solo el frontend"
	@echo "    make check        verifica el estado actual sin tocar nada"
	@echo "    make down         detiene los servicios"
	@echo "    make logs         ultimas lineas de cada log"
	@echo "    make logs-follow  sigue los logs de todos los servicios en vivo"
	@echo "    make test         suite de tests del backend"
	@echo "    make build        build de produccion del frontend"
	@echo ""
	@echo "  Servidor (ver docs/sistema/DEPLOY.md):"
	@echo "    make secrets      genera secretos reales en apps/core/.env"
	@echo "    make deploy-check valida compose.yaml contra el codigo"
	@echo "    make deploy-up    levanta el stack con Docker"
	@echo "    make deploy-down  detiene el stack"

up:
	$(PY) $(SADUCI) up

up-detach:
	$(PY) $(SADUCI) up --detach

up-backend:
	$(PY) $(SADUCI) up backend

up-platform:
	$(PY) $(SADUCI) up platform

check:
	$(PY) $(SADUCI) check

down:
	$(PY) $(SADUCI) down

logs:
	$(PY) $(SADUCI) logs

logs-follow:
	$(PY) $(SADUCI) logs --follow

test:
	$(PY) apps/core/tests/run_tests.py

secrets:
	$(PY) $(SADUCI) secrets

deploy-check:
	$(PY) $(SADUCI) deploy-check

deploy-up:
	$(COMPOSE) up -d --build

deploy-down:
	$(COMPOSE) down

build:
	cd apps/platform && bun run build

clean:
	rm -rf apps/platform/.next
	find apps/core/src -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@echo "limpio"

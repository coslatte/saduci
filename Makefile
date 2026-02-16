.PHONY: help build up down restart logs clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## Show logs from all services
	docker-compose logs -f

logs-gateway: ## Show logs from API gateway
	docker-compose logs -f api-gateway

logs-patient: ## Show logs from patient service
	docker-compose logs -f patient

logs-prediction: ## Show logs from prediction service
	docker-compose logs -f prediction

logs-simulation: ## Show logs from simulation service
	docker-compose logs -f simulation

clean: ## Stop services and remove volumes
	docker-compose down -v

ps: ## Show running services
	docker-compose ps

health: ## Check health of all services
	@echo "Checking API Gateway..."
	@curl -f http://localhost:8000/health || echo "API Gateway is down"
	@echo "\nChecking Patient Service..."
	@curl -f http://localhost:8001/health || echo "Patient Service is down"
	@echo "\nChecking Prediction Service..."
	@curl -f http://localhost:8002/health || echo "Prediction Service is down"
	@echo "\nChecking Simulation Service..."
	@curl -f http://localhost:8003/health || echo "Simulation Service is down"

shell-gateway: ## Open shell in API gateway container
	docker-compose exec api-gateway /bin/sh

shell-patient: ## Open shell in patient service container
	docker-compose exec patient /bin/sh

shell-prediction: ## Open shell in prediction service container
	docker-compose exec prediction /bin/sh

shell-simulation: ## Open shell in simulation service container
	docker-compose exec simulation /bin/sh

db-patient: ## Connect to patient database
	docker-compose exec patient-db psql -U patient_user -d patient_db

db-prediction: ## Connect to prediction database
	docker-compose exec prediction-db psql -U prediction_user -d prediction_db

db-simulation: ## Connect to simulation database
	docker-compose exec simulation-db psql -U simulation_user -d simulation_db

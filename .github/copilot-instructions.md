# GitHub Copilot Instructions for SADECI-Core

## Overview
SADECI-Core is a Python microservices backend for clinical intelligence in ICU settings. It uses FastAPI, Docker Compose, PostgreSQL, and integrates with SimUCI for realistic patient simulations.

## Architecture Guidelines

### Microservices Structure
- **API Gateway** (Port 8000): Central entry point with JWT auth and routing
- **Patient Service** (Port 8001): Patient CRUD with PostgreSQL
- **Prediction Service** (Port 8002): ML predictions with PostgreSQL
- **Simulation Service** (Port 8003): Clinical simulations with SimUCI integration

### Code Patterns
- Use FastAPI for all services
- Implement JWT authentication via API Gateway
- Use Pydantic schemas from `shared/schemas/` for type safety
- Follow REST API conventions
- Use Alembic for database migrations
- Implement health checks for all services
- Use structured logging with the shared logger

### Development Workflow
1. Work in feature branches
2. Update documentation in `docs/` folder
3. Add tests for new functionality
4. Use Docker Compose for local development
5. Follow security best practices (change defaults, use strong secrets)
6. Keep dependencies updated and patched

### File Organization
- Services in `services/` directory
- Shared code in `shared/` directory
- Documentation in `docs/` folder
- Environment configs in `.env` files
- Database migrations with Alembic

### Key Technologies
- Python 3.12+ (required for SimUCI)
- FastAPI for APIs
- PostgreSQL for databases
- Docker & Docker Compose
- JWT for authentication
- SimUCI for ICU simulations
- Alembic for migrations

### Security Requirements
- Never commit secrets or default passwords
- Use environment variables for configuration
- Implement proper input validation
- Add CORS configuration appropriately
- Use HTTPS in production

### Testing
- Use the provided `test_api.sh` for integration testing
- Test health endpoints
- Validate JWT authentication
- Test CRUD operations
- Verify SimUCI integration

### Deployment
- Use Docker Compose for orchestration
- Configure environment variables properly
- Monitor health checks
- Use proper logging levels

## Code Style
- Follow PEP 8
- Use type hints
- Write descriptive docstrings
- Keep functions small and focused
- Use meaningful variable names

## Common Tasks
- Adding new endpoints: Update API Gateway routing and implement in respective service
- Database changes: Create Alembic migrations
- New ML models: Add to Prediction Service
- Simulations: Integrate with SimUCI in Simulation Service
- Authentication: Handle via API Gateway

Remember to check existing code patterns and documentation before implementing new features.
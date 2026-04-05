# GitHub Copilot Instructions for SADECI-Core

## Overview

SADECI-Core is a Python microservices backend for clinical intelligence in ICU settings. It uses FastAPI, Docker Compose, PostgreSQL, and integrates with SimUCI for realistic patient simulations.

## Architecture Guidelines

### Microservices Structure

- **API Gateway** (Port 8000): Central entry point with JWT auth and routing
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
2. Update documentation incrementally:
  - For now, only maintain `docs/CHANGELOG.md` and `docs/ARCHITECTURE.md`
  - Record all meaningful technical progress in `docs/CHANGELOG.md`
  - Keep `docs/ARCHITECTURE.md` aligned with real code behavior
  - Do not recreate deleted docs unless explicitly requested in a future documentation iteration
3. Add tests for new functionality
4. Use Docker Compose for local development
5. Follow security best practices (change defaults, use strong secrets)
6. Keep dependencies updated and patched

### Documentation Policy (Current Project Phase)

- Documentation is intentionally centralized in two files only:
  - `docs/CHANGELOG.md`
  - `docs/ARCHITECTURE.md`
- Treat this as Iteration 1 of a 3-iteration documentation rebuild.
- Prefer adding high-value development details to `docs/CHANGELOG.md` until broader documentation is re-enabled.
- If implementation changes architecture, update both files in the same task whenever feasible.

### Environment & versioning (for AI agents)

- Use `uv` as the Python version manager and command runner for development and CI. AI agents must invoke Python and pip through `uv` (for example `uv run -m pytest`, `uv pip install ...`) instead of calling the system Python directly.
- Maintain exactly one project virtual environment: `.venv`. Do not create or depend on additional virtual environments.
- The project virtual environment must use `Python 3.13`. Agents must ensure `uv` is configured to use Python 3.13 and must not change the project's Python version.
- Always activate or use the repository `.venv` before running commands; avoid global installs. Avoid installing packages globally or in other virtual environments that are not the project `.venv`.

### File Organization

- Services in `services/` directory
- Shared code in `shared/` directory
- Documentation in `docs/` folder
- Environment configs in `.env` files
- Database migrations with Alembic

### Key Technologies

- Python 3.13+ (required for SimUCI)
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

- Test health endpoints
- Validate JWT authentication
- Test CRUD operations
- Verify SimUCI integration
- For testing, make sure you are using `uv`

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

- Adding new endpoints: Update API Gateway routing and implement in the target service
- Database changes: Create Alembic migrations
- New ML models: Add to Prediction Service
- Simulations: Integrate with SimUCI in Simulation Service
- Authentication: Handle via API Gateway

Remember to check existing code patterns and documentation before implementing new features.

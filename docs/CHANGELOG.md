# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-03

### Added

#### Test Suite Expansion
- `tests/test_api_gateway_auth_and_routing.py`: login validation, rate limiting, JWT expiry and tamper detection, parametrized protected/unprotected routes, 404 handling.
- `tests/test_patient_service_crud.py`: full CRUD lifecycle, pagination, CSV import (valid, invalid headers, oversized file, partial success).
- `tests/test_prediction_service_endpoints.py`: models catalogue, all three prediction models, risk level boundary checks, prediction history isolation.
- `tests/test_simulation_service_endpoints.py`: scenario catalogue, treatment/vital-signs/intervention simulations, patient history, `_make_time_stats` and `_mortality_prediction` unit tests, platform simulation validation, Wilcoxon and Friedman statistical endpoints.

Total tests increased from **31 to 137**.

#### Simulation Data
- `services/simulation/data/centroids.csv`: minimal centroid data (3 clusters × 11 features) required by SimUCI `CentroidLoader`. Without this file the platform simulation endpoint and related tests raised `FileNotFoundError`.

### Fixed

- **SQLite cross-thread failure in tests**: `TestClient` runs the ASGI app in a background thread; SQLite's default `SingletonThreadPool` issued a new connection per thread, causing `no such table` errors and `ProgrammingError: SQLite objects created in a thread can only be used in that same thread`. Fixed by overriding the SQLAlchemy engine with `StaticPool` + `check_same_thread=False` and injecting it via `app.dependency_overrides[get_db]` in all three service test factories (`_patient_client`, `_prediction_client`, `_sim_client`).
- **Friedman test NaN serialisation**: test used identical sample groups, causing SciPy to emit `NaN` from a division-by-zero in the tied-ranks correction, which `json.dumps` rejected with `ValueError: Out of range float values`. Fixed by using distinct per-group offsets so ranks are never fully tied.

## [1.0.1] - 2024-01-15

### Security
- **CRITICAL**: Updated FastAPI from 0.104.1 to 0.109.1 to fix Content-Type Header ReDoS vulnerability
- **CRITICAL**: Updated python-multipart from 0.0.6 to 0.0.22 to fix multiple vulnerabilities:
  - Arbitrary File Write via Non-Default Configuration
  - Denial of Service (DoS) via deformation multipart/form-data boundary
  - Content-Type Header ReDoS vulnerability

## [1.0.0] - 2024-01-15

### Added

#### Core Architecture
- Microservices architecture with FastAPI
- Docker Compose orchestration for all services
- JWT-based authentication via API Gateway
- Inter-service REST communication
- Shared Pydantic schemas for type safety
- Centralized logging configuration
- Health check endpoints for all services

#### Services
- **API Gateway** (Port 8000)
  - Request routing to downstream services
  - JWT token generation and validation
  - CORS configuration
  - Authentication endpoints

- **Patient Service** (Port 8001)
  - CRUD operations for patient management
  - Clinical data storage with JSON fields
  - CSV import for bulk data loading
  - PostgreSQL database with Alembic migrations
  - Full patient lifecycle management

- **Prediction Service** (Port 8002)
  - ML model integration framework
  - Mortality risk prediction model
  - Length of stay prediction model
  - Readmission risk prediction model
  - Prediction history tracking
  - PostgreSQL database for prediction records

- **Simulation Service** (Port 8003)
  - Clinical scenario simulation engine
  - Treatment response modeling
  - Vital signs projection
  - Intervention outcome analysis
  - Simulation history tracking
  - PostgreSQL database for simulation records

#### Database
- PostgreSQL 15 for all services
- Separate database per service
- Alembic migrations for schema versioning
- Health checks for database connectivity
- Persistent volumes for data

#### Development Tools
- Makefile for common operations
- Quick start script (start.sh)
- API test script (test_api.sh)
- Sample patient data (sample_patients.csv)
- Comprehensive documentation

#### Documentation
- README with quick start guide
- API Documentation with examples
- Contributing guidelines
- Deployment instructions
- Architecture overview

#### Security
- JWT token authentication
- Password hashing with bcrypt
- Environment-based configuration
- Secret management via .env files
- Database credential isolation

### Security Considerations
- Default credentials should be changed in production
- JWT secret key must be configured properly
- CORS should be restricted to specific origins
- HTTPS should be used in production
- Rate limiting should be implemented

### Known Limitations
- Authentication uses simplified demo logic (no user database)
- ML models are dummy implementations for demonstration
- No request rate limiting implemented
- No API versioning implemented
- No comprehensive test suite

## [Unreleased]

### Planned Features
- User management service
- Role-based access control (RBAC)
- Real ML model integration
- WebSocket support for real-time updates
- Monitoring and metrics (Prometheus/Grafana)
- ELK stack for centralized logging
- API rate limiting
- API versioning
- Comprehensive test suite
- CI/CD pipeline
- Kubernetes deployment manifests

---

## Version History

- **1.0.0** - Initial release with core microservices architecture

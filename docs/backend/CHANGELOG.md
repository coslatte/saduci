# Backend changelog

Este archivo registra cambios históricos del backend que antes vivía como SADUCI-Core.

## Documentación actual

La arquitectura compartida está en [`../ARCHITECTURE.md`](../ARCHITECTURE.md). La guía para ejecutar el backend está en [`README.md`](README.md).

## [Unreleased]

### Added (Unreleased)

- Reorganized the repository into a clearer top-level layout with `src/` for services
- **User Management CRUD with Roles**: Complete user management system in API Gateway with role-based access control:
  - Extended User model with `role` field (enum: ADMIN, MEDICO)
  - Five new REST endpoints for user CRUD operations:
    - `POST /api/users` – Create new user (admin-only)
    - `GET /api/users` – List all users with optional role filtering (admin-only)
    - `GET /api/users/{id}` – Fetch user by ID (authenticated)
    - `PUT /api/users/{id}` – Update user email, role, or status (admin-only)
    - `DELETE /api/users/{id}` – Delete user (admin-only)
  - Role-based authorization: only admin users (is_superuser=true) can create, update, or delete users
  - Password validation: minimum 8 characters enforced on creation and change
- Prediction platform inference now loads the trained artifact `src/prediction/models/v1/new_workflow.joblib` and returns enriched output for frontend consumption:
  - Comprehensive test suite covering CRUD operations, authorization, and edge cases (9 new tests, all passing)
  - Alembic migration script to add `role` column to users table with MEDICO as default
- Prediction platform inference now loads the trained artifact `research_files/new_workflow.joblib` and returns enriched output for frontend consumption:
  - probability and probability percent
  - binary class (`vive`/`muere`) with configurable threshold
  - explainability `rows` payload including feature value, baseline, signed contribution, and risk direction
- Optional narrative generation in `POST /prediction/explain` controlled by request flag `include_narrative`.
- Configurable narrative provider layer:
  - `stub` deterministic clinical summary (default)
  - `local` OpenAI-compatible local LLM endpoint via `PREDICTION_LOCAL_LLM_URL`
  - `gemini` provider via `PREDICTION_GEMINI_API_KEY` and `PREDICTION_GEMINI_MODEL`
  - `huggingface` HTTP provider kept for backward compatibility via `HUGGINGFACE_API_URL`
- Prediction service runtime dependencies for trained model compatibility: `joblib`, `pandas`, `scikit-learn==1.6.1`, `imbalanced-learn`.

### Fixed (Unreleased)

- Removed the Patient Service, the legacy `scripts/` helper, the archived `test-results/` artifacts, and the `tests/` suite so the repository now focuses on the gateway, prediction, and simulation services.
- Aligned the gateway, Compose stack, startup helpers, and documentation with the reduced service topology.
- Stabilized the Simulation Service fallback path by replacing process-local Python hash seeding with a deterministic SHA-256-based seed.

### Planned (Documentation Iterations)

- Iteration 2/3: add runbooks, operational procedures, and troubleshooting matrix.
- Iteration 3/3: normalize and split finalized docs into focused guides once content stabilizes.

## [1.2.0] - 2026-03-16

### Changed

- Consolidated project documentation to two canonical sources:
  - `docs/ARCHITECTURE.md`
  - `docs/CHANGELOG.md`
- Removed legacy markdown guides from `docs/` to avoid drift and duplicated information:
  - `API_DOCUMENTATION.md`
  - `CONTRIBUTING.md`
  - `DEPLOYMENT.md`
  - `GETTING_STARTED.md`
  - `IMPLEMENTATION_DETAILS.md`
  - `IMPLEMENTATION_SUMMARY.md`
  - `SECURITY.md`
  - `SIMUCI_INTEGRATION.md`

### Added (1.2.0)

- Expanded architecture baseline to reflect current code-level behavior:
  - API Gateway route surface including platform-compatible non-JWT routes.
  - Service boundaries and persistence responsibilities for prediction and simulation.
  - SimUCI integration mode and fallback simulation mode.
  - Statistical test endpoints and dependency requirements.
  - Current Docker Compose network and health-check model.

### Notes

- This is the first documentation consolidation release (Iteration 1/3).
- Development facts that were spread across removed docs were merged into architecture narrative and changelog history.

## [1.1.0] - 2026-03-03

### Added (1.1.0)

- Test suite expansion from 31 to 137 tests was previously recorded and is now being retired as the suite is rebuilt around the reduced architecture.
- `services/simulation/data/centroids.csv` added to satisfy SimUCI centroid loading.

### Fixed (1.1.0)

- SQLite cross-thread test failures resolved by using `StaticPool` and `check_same_thread=False` in service test DB overrides.
- Friedman NaN serialization issue fixed by avoiding fully tied sample groups in tests.

## [1.0.1] - 2024-01-15

### Security

- Updated FastAPI to remediate Content-Type Header ReDoS exposure.
- Updated python-multipart to remediate multipart parsing vulnerabilities (including DoS and unsafe write scenarios).

## [1.0.0] - 2024-01-15

### Added (1.0.0)

- Initial microservices backend release with:
  - API Gateway (JWT auth + service proxy)
  - Prediction Service (model execution + history)
  - Simulation Service (scenario simulations)
- Per-service PostgreSQL topology with Docker Compose orchestration.
- Shared schema and utility modules under `shared/`.
- Initial scripts and project entry points:
  - `start.sh`
  - `Makefile`

### Known Baseline Limitations at 1.0.0

- Demo-oriented authentication model.
- Early-stage ML prediction logic (dummy model strategy).
- No fully matured API versioning strategy.

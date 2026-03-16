# Changelog

All notable changes to SADECI-Core are tracked here.
This project follows Keep a Changelog and Semantic Versioning as a reference.

## Documentation Policy (Current)

- Active project docs are intentionally reduced to:
  - `docs/ARCHITECTURE.md`
  - `docs/CHANGELOG.md`
- Additional docs will be rebuilt progressively in 3 iterations.
- During this transition, architecture details and development history must be recorded in this file.

## [Unreleased]

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

### Added

- Expanded architecture baseline to reflect current code-level behavior:
  - API Gateway route surface including platform-compatible non-JWT routes.
  - Service boundaries and persistence responsibilities.
  - SimUCI integration mode and fallback simulation mode.
  - Statistical test endpoints and dependency requirements.
  - Current Docker Compose network and health-check model.

### Notes

- This is the first documentation consolidation release (Iteration 1/3).
- Development facts that were spread across removed docs were merged into architecture narrative and changelog history.

## [1.1.0] - 2026-03-03

### Added

- Test suite expansion from 31 to 137 tests.
- Coverage added for:
  - gateway auth and routing hardening
  - patient CRUD and CSV import edge cases
  - prediction model endpoints and boundaries
  - simulation scenarios, platform endpoints, and statistics endpoints
- `services/simulation/data/centroids.csv` added to satisfy SimUCI centroid loading.

### Fixed

- SQLite cross-thread test failures resolved by using `StaticPool` and `check_same_thread=False` in service test DB overrides.
- Friedman NaN serialization issue fixed by avoiding fully tied sample groups in tests.

## [1.0.1] - 2024-01-15

### Security

- Updated FastAPI to remediate Content-Type Header ReDoS exposure.
- Updated python-multipart to remediate multipart parsing vulnerabilities (including DoS and unsafe write scenarios).

## [1.0.0] - 2024-01-15

### Added

- Initial microservices backend release with:
  - API Gateway (JWT auth + service proxy)
  - Patient Service (CRUD + import)
  - Prediction Service (model execution + history)
  - Simulation Service (scenario simulations)
- Per-service PostgreSQL topology with Docker Compose orchestration.
- Shared schema and utility modules under `shared/`.
- Initial scripts and project entry points:
  - `start.sh`
  - `test_api.sh`
  - `Makefile`

### Known Baseline Limitations at 1.0.0

- Demo-oriented authentication model.
- Early-stage ML prediction logic (dummy model strategy).
- No fully matured API versioning strategy.

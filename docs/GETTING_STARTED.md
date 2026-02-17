# Getting Started with SADECI-Core

This guide will help you get the SADECI-Core project up and running on your local machine for development and testing purposes.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

1. **Docker** (version 20.10 or later)
   - Download from [docker.com](https://www.docker.com/get-started)
   - Verify installation: `docker --version`

2. **Docker Compose** (v2.0 or later)
   - Usually included with Docker Desktop
   - Verify installation: `docker compose version`

3. **Python 3.13+** (for local development only)
  - **Important**: Python 3.13+ is required for SimUCI integration
   - Download from [python.org](https://www.python.org/downloads/)
   - Verify installation: `python3 --version`

4. **Git**
   - Download from [git-scm.com](https://git-scm.com/downloads)
   - Verify installation: `git --version`

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 5GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux

## Quick Start (Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/coslatte/sadeci-core.git
cd sadeci-core
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

**Optional**: Edit `.env` to customize settings (use default values for development).

### 3. Start All Services

Using Docker Compose:

```bash
docker compose up --build -d
```

Or using the convenience script:

```bash
./start.sh
```

### 4. Verify Services are Running

Wait about 30 seconds for all services to start, then check their status:

```bash
# Check all containers are running
docker compose ps

# Or use the Makefile
make ps
```

### 5. Test Health Endpoints

```bash
curl http://localhost:8000/health  # API Gateway
curl http://localhost:8001/health  # Patient Service
curl http://localhost:8002/health  # Prediction Service
curl http://localhost:8003/health  # Simulation Service
```

All services should return `{"status": "healthy"}`.

## Access the Services

Once running, you can access:

- **API Gateway**: http://localhost:8000
  - Swagger UI: http://localhost:8000/docs
- **Patient Service**: http://localhost:8001
  - Swagger UI: http://localhost:8001/docs
- **Prediction Service**: http://localhost:8002
  - Swagger UI: http://localhost:8002/docs
- **Simulation Service**: http://localhost:8003
  - Swagger UI: http://localhost:8003/docs

## Your First API Call

### 1. Authenticate

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

This returns a JWT token. Save it for subsequent requests.

### 2. Create a Patient

```bash
export TOKEN="your-jwt-token-here"

curl -X POST "http://localhost:8000/api/patients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1980-01-15T00:00:00",
    "gender": "M",
    "clinical_data": {"diagnosis": "ICU admission"}
  }'
```

### 3. Run a Simulation

```bash
curl -X POST "http://localhost:8000/api/simulations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "scenario": "treatment_response",
    "parameters": {
      "treatment": "aggressive",
      "baseline_severity": 8,
      "duration_hours": 24
    }
  }'
```

## Local Development Setup

If you want to develop individual services without Docker:

### 1. Create a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# For a specific service, e.g., patient service
cd services/patient
pip install -r requirements.txt
```

### 3. Set Up Database

Start the database containers:

```bash
docker compose up patient-db -d
```

Run migrations:

```bash
cd services/patient
alembic upgrade head
```

### 4. Run the Service

```bash
python main.py
```

The service will start on its designated port (e.g., 8001 for patient service).

## Useful Commands

### Using Makefile

```bash
make build      # Build all Docker images
make up         # Start all services
make down       # Stop all services
make logs       # View logs from all services
make health     # Check health of all services
make clean      # Stop services and remove volumes
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f patient
```

### Database Access

```bash
# Connect to patient database
make db-patient

# Or directly
docker compose exec patient-db psql -U patient_user -d patient_db
```

### Shell Access

```bash
# Open shell in a service container
make shell-patient

# Or directly
docker compose exec patient /bin/sh
```

## Troubleshooting

### Services Not Starting

**Problem**: Containers restart continuously

**Solution**:
1. Check logs: `docker compose logs <service-name>`
2. Ensure all required ports are available (8000-8003, 5432)
3. Verify `.env` file exists
4. Try rebuilding: `docker compose down && docker compose up --build`

### Database Connection Errors

**Problem**: Services can't connect to databases

**Solution**:
1. Verify database containers are running: `docker compose ps`
2. Check database health: `docker compose logs patient-db`
3. Wait 10-15 seconds for databases to fully initialize

### Python Version Issues

**Problem**: SimUCI or other dependencies fail to install

**Solution**:
- Ensure you're using Python 3.13+
- Verify: `python3 --version`
- Update Python if necessary

### Port Already in Use

**Problem**: Cannot bind to port XXXX

**Solution**:
1. Stop services using those ports
2. Or modify port mappings in `docker-compose.yml`

### Build Failures

**Problem**: Docker build fails

**Solution**:
1. Clear Docker cache: `docker system prune -a`
2. Ensure stable internet connection (for downloading dependencies)
3. Try building services individually:
   ```bash
   docker compose build patient
   docker compose build prediction
   # etc.
   ```

## Testing the Setup

Run the provided test script to verify everything works:

```bash
./test_api.sh
```

This script tests all major endpoints and verifies the system is functioning correctly.

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
- Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for detailed API reference
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Explore [SIMUCI_INTEGRATION.md](SIMUCI_INTEGRATION.md) for SimUCI-specific details

## Getting Help

- Check existing documentation in the repository
- Review error logs with `docker compose logs`
- Open an issue on GitHub for bugs or questions
- Consult [SECURITY.md](SECURITY.md) for security-related questions

## Clean Up

To stop and remove all containers, networks, and volumes:

```bash
docker compose down -v
```

**Warning**: This will delete all data in the databases!

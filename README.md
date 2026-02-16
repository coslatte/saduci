# SADECI-Core

**Clinical Intelligence Core for ICU** - A Python microservices backend with FastAPI for clinical data management, ML predictions, and scenario simulations.

> **Security Note**: All dependencies have been updated to patched versions to address known vulnerabilities (FastAPI 0.109.1, python-multipart 0.0.22).

## 🏗️ Architecture

This system implements a microservices architecture with the following components:

### Services

1. **API Gateway** (Port 8000)
   - Central entry point for all API requests
   - JWT-based authentication
   - Request routing to downstream services
   - CORS configuration

2. **Patient Service** (Port 8001)
   - Patient CRUD operations
   - Clinical data management
   - CSV import for bulk data loading
   - PostgreSQL database for patient records

3. **Prediction Service** (Port 8002)
   - ML model integration for clinical predictions
   - Mortality risk assessment
   - Length of stay predictions
   - Readmission risk analysis
   - PostgreSQL database for prediction history

4. **Simulation Service** (Port 8003)
   - Clinical scenario simulations
   - Treatment response modeling
   - Vital signs projections
   - Intervention outcome analysis
   - PostgreSQL database for simulation records

### Key Features

- ✅ **Microservices Architecture**: Independent, scalable services
- ✅ **Docker Compose Orchestration**: Easy deployment and scaling
- ✅ **JWT Authentication**: Secure API access via API Gateway
- ✅ **PostgreSQL per Service**: Isolated databases for each service
- ✅ **REST API Communication**: Standard inter-service communication
- ✅ **Shared Pydantic Schemas**: Type-safe data validation
- ✅ **Alembic Migrations**: Database version control
- ✅ **Health Checks**: Service monitoring and health status
- ✅ **Structured Logging**: Centralized logging configuration
- ✅ **Environment Configuration**: `.env` files for each service

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)

### Running with Docker Compose

1. **Clone the repository**
   ```bash
   git clone https://github.com/coslatte/sadeci-core.git
   cd sadeci-core
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start all services**
   ```bash
   docker-compose up --build
   ```

4. **Access the services**
   - API Gateway: http://localhost:8000
   - Patient Service: http://localhost:8001
   - Prediction Service: http://localhost:8002
   - Simulation Service: http://localhost:8003

### API Documentation

Each service provides interactive API documentation via Swagger UI:

- API Gateway: http://localhost:8000/docs
- Patient Service: http://localhost:8001/docs
- Prediction Service: http://localhost:8002/docs
- Simulation Service: http://localhost:8003/docs

## 📖 Usage Examples

### Authentication

```bash
# Login to get JWT token
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### Patient Management

```bash
# Create a patient (requires JWT token)
curl -X POST "http://localhost:8000/api/patients" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1980-01-15T00:00:00",
    "gender": "M",
    "clinical_data": {"diagnosis": "ICU admission"}
  }'

# Get all patients
curl -X GET "http://localhost:8000/api/patients" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get specific patient
curl -X GET "http://localhost:8000/api/patients/P001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### ML Predictions

```bash
# Create a prediction
curl -X POST "http://localhost:8000/api/predictions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "model_name": "mortality_risk",
    "features": {
      "age": 65,
      "severity_score": 7
    }
  }'
```

### Clinical Simulations

```bash
# Run a simulation
curl -X POST "http://localhost:8000/api/simulations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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

## 🛠️ Development

### Local Development Setup

1. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies for a service**
   ```bash
   pip install -r services/patient/requirements.txt
   ```

3. **Run database migrations**
   ```bash
   cd services/patient
   alembic upgrade head
   ```

4. **Run a service locally**
   ```bash
   python services/patient/main.py
   ```

### Project Structure

```
sadeci-core/
├── services/
│   ├── api-gateway/          # API Gateway service
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── patient/              # Patient management service
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   ├── alembic/          # Database migrations
│   │   └── .env.example
│   ├── prediction/           # ML prediction service
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── simulation/           # Clinical simulation service
│       ├── main.py
│       ├── requirements.txt
│       ├── Dockerfile
│       └── .env.example
├── shared/
│   ├── schemas/              # Shared Pydantic models
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── patient.py
│   │   ├── user.py
│   │   ├── prediction.py
│   │   └── simulation.py
│   └── utils/                # Shared utilities
│       ├── __init__.py
│       ├── logger.py
│       ├── auth.py
│       └── http_client.py
├── docker-compose.yml        # Docker Compose orchestration
├── .env.example              # Environment variables template
├── .gitignore
└── README.md
```

### Database Migrations

Each service uses Alembic for database migrations:

```bash
# Create a new migration
cd services/patient
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🔒 Security

- Change default passwords in production
- Use strong SECRET_KEY for JWT tokens
- Configure CORS appropriately
- Use HTTPS in production
- Keep dependencies updated
- Implement rate limiting
- Add request validation

## 📊 Monitoring

Health check endpoints are available for all services:

```bash
curl http://localhost:8000/health  # API Gateway
curl http://localhost:8001/health  # Patient Service
curl http://localhost:8002/health  # Prediction Service
curl http://localhost:8003/health  # Simulation Service
```

## 🧪 Testing

To stop all services:

```bash
docker-compose down
```

To stop and remove volumes:

```bash
docker-compose down -v
```

## 📝 License

This project is part of the Clinical Intelligence Core for ICU.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📧 Contact

For questions or support, please open an issue in the repository.

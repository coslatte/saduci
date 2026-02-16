# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         External Clients                             │
│                    (Web Apps, Mobile Apps, etc.)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             │
                    ┌────────▼────────┐
                    │  Nginx/Proxy    │
                    │   (Port 443)    │
                    └────────┬────────┘
                             │
┌────────────────────────────┴────────────────────────────────────────┐
│                         SADECI-Core                                  │
│                   Docker Compose Network                             │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      API Gateway                              │  │
│  │                      (Port 8000)                              │  │
│  │  • JWT Authentication                                         │  │
│  │  • Request Routing                                            │  │
│  │  • CORS Management                                            │  │
│  └───┬─────────────┬─────────────┬─────────────┬────────────────┘  │
│      │             │             │             │                    │
│      │ REST        │ REST        │ REST        │                    │
│      │             │             │             │                    │
│  ┌───▼──────┐  ┌──▼──────┐  ┌──▼──────┐  ┌──▼──────┐             │
│  │ Patient  │  │Prediction│  │Simulation│  │  Future │             │
│  │ Service  │  │ Service  │  │ Service  │  │ Services│             │
│  │(Pt 8001) │  │(Pt 8002) │  │(Pt 8003) │  │         │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────┘             │
│       │             │             │                                 │
│       │ PostgreSQL  │ PostgreSQL  │ PostgreSQL                      │
│       │             │             │                                 │
│  ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐                         │
│  │Patient DB│  │Predict DB│  │Simul. DB │                         │
│  │(Pt 5432) │  │(Pt 5432) │  │(Pt 5432) │                         │
│  └──────────┘  └──────────┘  └──────────┘                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Details

### API Gateway (Port 8000)

**Responsibilities:**
- Centralized entry point for all API requests
- JWT token generation and validation
- Request routing to appropriate microservices
- CORS policy enforcement
- Authentication and authorization

**Technology Stack:**
- FastAPI
- Python-Jose (JWT)
- Passlib (Password hashing)
- Httpx (HTTP client)

**Endpoints:**
- `POST /auth/login` - User authentication
- `GET /health` - Health check
- `GET /api/patients/*` - Patient service proxy
- `POST /api/predictions` - Prediction service proxy
- `POST /api/simulations` - Simulation service proxy

### Patient Service (Port 8001)

**Responsibilities:**
- Patient CRUD operations
- Clinical data management
- Bulk data import via CSV
- Patient record persistence

**Technology Stack:**
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Alembic (Migrations)

**Database Schema:**
```sql
Table: patients
- id (INTEGER, PRIMARY KEY)
- patient_id (STRING, UNIQUE, INDEXED)
- first_name (STRING)
- last_name (STRING)
- date_of_birth (DATETIME)
- gender (STRING)
- clinical_data (JSON)
- created_at (DATETIME)
- updated_at (DATETIME)
```

**Endpoints:**
- `GET /health` - Health check
- `GET /patients` - List all patients
- `POST /patients` - Create patient
- `GET /patients/{id}` - Get patient
- `PUT /patients/{id}` - Update patient
- `DELETE /patients/{id}` - Delete patient
- `POST /patients/import` - Import CSV

### Prediction Service (Port 8002)

**Responsibilities:**
- ML model integration
- Clinical predictions (mortality, LOS, readmission)
- Prediction history tracking
- Model registry management

**Technology Stack:**
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- NumPy (for ML operations)

**Database Schema:**
```sql
Table: predictions
- id (INTEGER, PRIMARY KEY)
- patient_id (STRING, INDEXED)
- model_name (STRING)
- features (JSON)
- prediction (JSON)
- confidence (FLOAT)
- created_at (DATETIME)
```

**Available Models:**
1. **Mortality Risk**: Predicts patient mortality risk
2. **Length of Stay**: Estimates ICU stay duration
3. **Readmission Risk**: Predicts readmission probability

**Endpoints:**
- `GET /health` - Health check
- `GET /models` - List available models
- `POST /predictions` - Create prediction
- `GET /predictions/{patient_id}` - Get predictions

### Simulation Service (Port 8003)

**Responsibilities:**
- Clinical scenario simulations
- Treatment response modeling
- Vital signs projection
- Intervention outcome analysis

**Technology Stack:**
- FastAPI
- SQLAlchemy ORM
- PostgreSQL

**Database Schema:**
```sql
Table: simulations
- id (INTEGER, PRIMARY KEY)
- patient_id (STRING, INDEXED)
- scenario (STRING)
- parameters (JSON)
- results (JSON)
- created_at (DATETIME)
```

**Available Scenarios:**
1. **Treatment Response**: Simulate patient response to treatments
2. **Vital Signs Projection**: Project vital signs over time
3. **Intervention Outcomes**: Analyze intervention success rates

**Endpoints:**
- `GET /health` - Health check
- `GET /scenarios` - List scenarios
- `POST /simulations` - Run simulation
- `GET /simulations/{patient_id}` - Get simulations

### Shared Components

#### Schemas (`shared/schemas/`)
Pydantic models for type-safe data validation:
- `health.py` - Health check models
- `patient.py` - Patient data models
- `user.py` - User authentication models
- `prediction.py` - Prediction request/response models
- `simulation.py` - Simulation request/response models

#### Utils (`shared/utils/`)
Common utilities across services:
- `logger.py` - Centralized logging
- `auth.py` - JWT token handling
- `http_client.py` - Inter-service communication

## Data Flow

### 1. Authentication Flow
```
Client → API Gateway → Generate JWT → Return Token
```

### 2. Patient Creation Flow
```
Client → API Gateway (verify JWT) → Patient Service → PostgreSQL
```

### 3. Prediction Flow
```
Client → API Gateway (verify JWT) → Prediction Service → 
    Query Patient Data (optional) → Run ML Model → 
    Save Result → Return Prediction
```

### 4. Simulation Flow
```
Client → API Gateway (verify JWT) → Simulation Service → 
    Load Patient Context (optional) → Run Simulation Engine → 
    Save Results → Return Simulation Results
```

## Security Architecture

### Authentication
- JWT tokens with configurable expiration
- Password hashing using bcrypt
- Token validation on all protected endpoints

### Network Security
- Services communicate within Docker network
- Only API Gateway exposed externally
- Database ports not exposed to host

### Data Security
- Environment-based configuration
- Secrets managed via .env files
- Database credentials isolated per service

## Scalability Considerations

### Horizontal Scaling
Each service can be scaled independently:
```yaml
services:
  patient:
    deploy:
      replicas: 3
```

### Load Balancing
- Use nginx/haproxy for load balancing
- Docker's built-in load balancing for service replicas

### Database Scaling
- Each service has dedicated database
- Can implement read replicas
- Connection pooling configured in SQLAlchemy

## Monitoring and Health

### Health Checks
All services expose `/health` endpoint:
```json
{
  "status": "healthy",
  "service": "service-name",
  "version": "1.0.0"
}
```

### Logging
- Structured logging to stdout
- Centralized via Docker logging drivers
- Log levels configurable via environment

### Metrics (Future)
- Prometheus metrics endpoint
- Grafana dashboards
- Request/response times
- Error rates

## Development Workflow

```
Developer → Git → Docker Compose → Build → Test → Deploy
```

### Local Development
1. Clone repository
2. Run `./start.sh`
3. Access services at localhost:8000-8003
4. Interactive API docs at /docs

### Testing
1. Manual: `./test_api.sh`
2. Unit tests: (to be implemented)
3. Integration tests: (to be implemented)

## Deployment Environments

### Development
- Local Docker Compose
- SQLite option for quick testing
- Hot reload enabled

### Staging
- Docker Compose on staging server
- PostgreSQL databases
- Similar to production setup

### Production
- Docker Compose or Kubernetes
- PostgreSQL with backups
- Nginx reverse proxy with SSL
- Monitoring and alerting

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | 3.11+ |
| API Framework | FastAPI | 0.104.1 |
| ASGI Server | Uvicorn | 0.24.0 |
| ORM | SQLAlchemy | 2.0.23 |
| Database | PostgreSQL | 15 |
| Migrations | Alembic | 1.13.0 |
| Auth | Python-Jose | 3.3.0 |
| Password | Passlib | 1.7.4 |
| HTTP Client | Httpx | 0.25.1 |
| Validation | Pydantic | 2.5.0 |
| Containerization | Docker | 20.10+ |
| Orchestration | Docker Compose | 2.0+ |

## Future Enhancements

1. **User Management Service**
   - User registration and profiles
   - Role-based access control (RBAC)
   - Audit logging

2. **Real ML Models**
   - TensorFlow/PyTorch integration
   - Model versioning
   - A/B testing framework

3. **Message Queue**
   - RabbitMQ or Kafka
   - Async task processing
   - Event-driven architecture

4. **Caching Layer**
   - Redis for session management
   - Cache frequently accessed data
   - Improve response times

5. **API Gateway Enhancements**
   - Rate limiting
   - Request throttling
   - API versioning

6. **Monitoring Stack**
   - Prometheus for metrics
   - Grafana for visualization
   - ELK stack for logs
   - Jaeger for tracing

7. **CI/CD Pipeline**
   - GitHub Actions
   - Automated testing
   - Automated deployment
   - Container registry

8. **WebSocket Support**
   - Real-time updates
   - Live monitoring
   - Push notifications

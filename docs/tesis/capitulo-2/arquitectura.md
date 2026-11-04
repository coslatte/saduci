# Arquitectura de SADUCI

## 1. Visión General de la Arquitectura

SADUCI implementa una **arquitectura de microservicios** diseñada para separar cargas de trabajo diferenciadas: los servicios de inferencia de modelos (CPU-bound) se ejecutan independientemente de la lógica web de entrada/salida (I/O-bound). Esta modularidad permite escalar cada componente según la demanda y facilita el mantenimiento independizado.

La plataforma se compone de dos repositorios principales:
- **saduci-core**: Backend Python/FastAPI con microservicios
- **saduci-platform**: Frontend Next.js 16 + React 19

---

## 2. Diagrama de Arquitectura de Alto Nivel

```mermaid
graph TB
    subgraph Clients["Capa de Clientes"]
        Browser[("Navegador Web<br/>Personal Médico")]
        Admin[("Panel Admin<br/>Administrador")]
    end

    subgraph Frontend["saduci-platform (Frontend)"]
        NextJS["Next.js 16 App Router"]
        RSC["React Server Components"]
        ClientComp["Client Components<br/>'use client'"]
        Atomic["Sistema Atómico<br/>Atoms/Molecules/Organisms"]
    end

    subgraph Backend["saduci-core (Backend Microservicios)"]
        Gateway["API Gateway<br/>:8000 JWT Auth + Proxy"]
        PredService["Prediction Service<br/>:8002 CPU-bound ML"]
        SimService["Simulation Service<br/>:8003 Simulation Engine"]
    end

    subgraph Data["Capa de Datos"]
        PredDB[("prediction-db<br/>PostgreSQL")]
        SimDB[("simulation-db<br/>PostgreSQL")]
        MLModel[("Modelo ML<br/>new_workflow.joblib")]
        SimUCI["SimUCI Engine"]
    end

    Browser --> NextJS
    Admin --> NextJS
    NextJS --> RSC
    NextJS --> ClientComp
    RSC --> Gateway
    ClientComp --> Gateway
    Gateway -->|"/api/predictions"| PredService
    Gateway -->|"/api/simulations"| SimService
    Gateway -->|"/prediccion"| PredService
    Gateway -->|"/simulation"| SimService
    PredService --> PredDB
    PredService --> MLModel
    SimService --> SimDB
    SimService --> SimUCI
```

---

## 3. Patrones Arquitectónicos

### 3.1 Microservicios

Cada servicio de dominio es independiente y autocontenido:

| Servicio | Responsabilidad | Puerto | Base de Datos | Carga |
|----------|-----------------|--------|---------------|-------|
| API Gateway | Autenticación JWT y proxy | 8000 | — | I/O |
| Prediction Service | Inferencia ML y explicabilidad | 8002 | prediction-db | CPU |
| Simulation Service | Simulación clínica y estadística | 8003 | simulation-db | CPU |

### 3.2 API Gateway Pattern

El API Gateway centraliza todas las peticiones HTTP, proporcionando:

- **Autenticación JWT**: Validación de tokens para rutas protegidas
- **Proxy inverso**: Redirección a servicios internos según la ruta
- **Rutas públicas**: Endpoints específicos sin JWT para la plataforma web
- **Rutas protegidas**: Endpoints internos que requieren Bearer token

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant PredService
    participant MLModel

    Client->>Gateway: POST /prediccion (sin JWT)
    Gateway->>Gateway: Validar CORS
    Gateway->>PredService: Proxy request
    PredService->>MLModel: Inference (new_workflow.joblib)
    MLModel-->>PredService: Probabilidad + Clase
    PredService-->>Gateway: Respuesta estructurada
    Gateway-->>Client: {probability, predicted_class, rows...}
```

### 3.3 Database per Service

Cada microservicio mantiene su propia base de datos PostgreSQL:

```mermaid
erDiagram
    PREDICTION_DB {
        int id PK
        string patient_id
        string model_name
        jsonb features
        float probability
        int predicted_class
        timestamp created_at
    }

    SIMULATION_DB {
        int id PK
        string patient_id
        string scenario
        jsonb parameters
        jsonb results
        timestamp created_at
    }
```

### 3.4 BFF (Backend for Frontend)

El frontend Next.js actúa como BFF, consumiendo los microservicios mediante API routes internas que adaptan los contratos al formato esperado por los componentes React.

---

## 4. Stack Tecnológico

### 4.1 Frontend (saduci-platform)

| Componente | Tecnología | Versión | Propósito |
|------------|------------|---------|-----------|
| Framework | Next.js | 16.1.6 | App Router + RSC |
| UI Library | React | 19.2.3 | Concurrent Features |
| Runtime | Bun | 1.3+ | Bundler, test runner |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Charts | Recharts | — | Visualización de datos |
| Icons | react-icons | — | SVG vectoriales |
| Table | @tanstack/react-table | — | Tablas headless |
| Testing | Bun test + Happy DOM | — | Unit tests |

### 4.2 Backend (saduci-core)

| Componente | Tecnología | Propósito |
|------------|-----------|---------|
| API Gateway | FastAPI (Python) | Autenticación y proxy |
| ML Services | Python (scikit-learn) | Inferencia de modelos |
| Simulation | Python + SimUCI | Motor de simulación |
| Serialization | joblib | Modelos entrenados |
| Orchestration | Docker Compose | Contenedores |
| Database | PostgreSQL | Persistencia por servicio |

### 4.3 Infraestructura

| Componente | Tecnología | Propósito |
|------------|-----------|----------|
| Containers | Docker + Docker Compose | Despliegue modular |
| Health Checks | HTTP /health | Monitoreo de servicios |
| Network | Docker internal | Aislamiento de BBDD |
| Restart Policy | unless-stopped | Recuperación automática |

---

## 5. Flujo de Datos

### 5.1 Flujo de Predicción Clínica

```mermaid
flowchart LR
    A["Datos del Paciente\n(edad, diag, apache...)"] --> B["Frontend\nNext.js"]
    B --> C["API Route\n/prediction"]
    C --> D["API Gateway\n:8000"]
    D --> E["Prediction Service\n:8002"]
    E --> F["Pipeline ML\nnew_workflow.joblib"]
    F --> G["Probabilidad\n+ Clase"]
    G --> H["Explicabilidad\n(SHAP/LIME)"]
    H --> I["Respuesta Enriquecida\n(rows + narrativa)"]
    I --> D
    D --> B
    B --> J["UI React\n(gráfico + tabla)"]
```

### 5.2 Flujo de Simulación Clínica

```mermaid
flowchart LR
    A["Parámetros Paciente\n(edad, apache, diag...)"] --> B["Simulation Service\n:8003"]
    B --> C{"¿SimUCI disponible?"}
    C -->|Sí| D["SimUCI Engine\n(single_run)"]
    C -->|No| E["Fallback Determ.\n(SHA-256 seed)"]
    D --> F["Estadísticas\n(mean, std, CI 95%)"]
    E --> F
    F --> G["ICUPatientSimulation\nResponse"]
```

### 5.3 Flujo de Autenticación

```mermaid
sequenceDiagram
    participant User as Usuario
    participant Frontend
    participant Gateway
    participant Auth as JWT Service

    User->>Frontend: Login (email, password)
    Frontend->>Gateway: POST /auth/login
    Gateway->>Gateway: Validate credentials
    Gateway->>Auth: Generate JWT
    Auth-->>Gateway: Token + Expiry
    Gateway-->>Frontend: {access_token, token_type}
    Frontend-->>User: Authenticated session

    User->>Frontend: Request to /api/predictions
    Frontend->>Gateway: GET /api/predictions (Bearer token)
    Gateway->>Gateway: Validate JWT
    Gateway->>PredService: Proxy request
```

---

## 6. Modelo de Despliegue

```mermaid
graph TD
    subgraph DockerHost["Host (Docker Compose)"]
        Gateway[("api-gateway\n:8000")]
        Pred[("prediction\n:8002")]
        PredDB[("prediction-db\nPostgreSQL")]
        Sim[("simulation\n:8003")]
        SimDB[("simulation-db\nPostgreSQL"))

        Gateway --> Pred
        Gateway --> Sim
        Pred --> PredDB
        Sim --> SimDB
    end

    subgraph External["Acceso Externo"]
        Browser["Navegador\n:saduci-platform"]
        Platform["saduci-platform\n:3000"]
    end

    Platform -->|"HTTP"| Gateway
    Browser -->|"HTTPS"| Platform
```

---

## 7. Modelos de Datos

### 7.1 Esquemas de Predicción

```mermaid
erDiagram
    PlatformPredictionRequest {
        int edad "14-61"
        int diag_ing1 "1-20"
        int diag_ing2 "39-173"
        int diag_egr2 "18-40"
        int apache "18-40"
        int tiempo_vam "18-40"
    }

    PlatformPredictionResponse {
        float probability "0-1"
        float probability_percent "0-100"
        int predicted_class "0|1"
        string predicted_label "vive|muere"
        float threshold "default: 0.5"
    }

    PlatformExplanationResponse {
        string method "LIME|SHAP|..."
        List rows "feature explanations"
        string narrative "optional"
    }
```

### 7.2 Esquemas de Simulación

```mermaid
erDiagram
    ICUPatientSimulationRequest {
        string patient_id
        int age "14-100"
        int apache "0-70"
        int diagnosis_admission1-4
        int respiratory_insufficiency "0-8"
        int artificial_ventilation "0-3"
        int uti_stay "1-8760h"
        int vam_time "0-8760h"
        int preuti_stay_time "0-8760h"
        int percent "1-100"
        int n_replications "1-1000"
    }

    TimeStats {
        float mean
        float std
        float ci_lower "95%"
        float ci_upper "95%"
    }
```

---

## 8. Decisiones Arquitectónicas

| ID | Decisión | Justificación |
|----|----------|---------------|
| ARQ-001 | Microservicios sobre monolito | Separación de cargas CPU/I/O, escalabilidad independiente |
| ARQ-002 | JWT para autenticación | Stateless, escalable, compatible con múltiples clientes |
| ARQ-003 | Database per Service | Desacoplamiento, autonomía de cada dominio |
| ARQ-004 | RSC por defecto en Next.js | Optimización de render inicial, reducción de JavaScript al cliente |
| ARQ-005 | Atomic Design para componentes | Consistencia visual, reutilización, testabilidad |
| ARQ-006 | SimUCI con fallback determinista | Disponibilidad garantizada sin dependencia de biblioteca externa |
| ARQ-007 | Docker Compose con health checks | Despliegue reproducible y monitoreo de disponibilidad |
| ARQ-008 | BFF pattern en Next.js | Adaptación de contratos API al formato React |

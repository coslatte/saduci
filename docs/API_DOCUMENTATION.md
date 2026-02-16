# API Documentation

## Overview

SADECI-Core provides a RESTful API for managing ICU patient data, running ML predictions, and performing clinical simulations.

## Authentication

All API requests (except health checks and login) require JWT authentication.

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

Use the access token in subsequent requests:
```http
Authorization: Bearer {access_token}
```

## Patient Management API

### List Patients

```http
GET /api/patients
Authorization: Bearer {token}
```

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100)

### Create Patient

```http
POST /api/patients
Authorization: Bearer {token}
Content-Type: application/json

{
  "patient_id": "P001",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1980-01-15T00:00:00",
  "gender": "M",
  "clinical_data": {
    "diagnosis": "ARDS",
    "admission_date": "2024-01-01"
  }
}
```

### Get Patient

```http
GET /api/patients/{patient_id}
Authorization: Bearer {token}
```

### Update Patient

```http
PUT /api/patients/{patient_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "first_name": "John",
  "clinical_data": {
    "diagnosis": "ARDS - Improving"
  }
}
```

### Delete Patient

```http
DELETE /api/patients/{patient_id}
Authorization: Bearer {token}
```

### Import Clinical Data

```http
POST /patients/import
Content-Type: multipart/form-data

file: [CSV file]
```

**CSV Format:**
```csv
patient_id,first_name,last_name,date_of_birth,gender,clinical_data
P001,John,Doe,1980-01-15,M,"{""diagnosis"": ""ARDS""}"
```

## Prediction API

### List Available Models

```http
GET /models
```

**Response:**
```json
{
  "models": [
    {
      "name": "mortality_risk",
      "description": "Predicts mortality risk based on clinical features",
      "required_features": ["age", "severity_score"]
    },
    {
      "name": "length_of_stay",
      "description": "Predicts expected length of stay in ICU",
      "required_features": ["age", "severity_score"]
    },
    {
      "name": "readmission_risk",
      "description": "Predicts risk of hospital readmission",
      "required_features": ["age", "comorbidities"]
    }
  ]
}
```

### Create Prediction

```http
POST /api/predictions
Authorization: Bearer {token}
Content-Type: application/json

{
  "patient_id": "P001",
  "model_name": "mortality_risk",
  "features": {
    "age": 65,
    "severity_score": 7
  }
}
```

**Response:**
```json
{
  "patient_id": "P001",
  "model_name": "mortality_risk",
  "prediction": {
    "risk_score": 0.425,
    "risk_level": "medium"
  },
  "confidence": 0.85,
  "timestamp": "2024-01-15T10:30:00"
}
```

### Get Patient Predictions

```http
GET /predictions/{patient_id}
```

## Simulation API

### List Available Scenarios

```http
GET /scenarios
```

**Response:**
```json
{
  "scenarios": [
    {
      "name": "treatment_response",
      "description": "Simulate patient response to different treatments",
      "required_parameters": ["treatment", "baseline_severity", "duration_hours"]
    },
    {
      "name": "vital_signs_projection",
      "description": "Project vital signs over time",
      "required_parameters": ["heart_rate", "blood_pressure_sys", "duration_hours"]
    },
    {
      "name": "intervention_outcomes",
      "description": "Simulate outcomes of different medical interventions",
      "required_parameters": ["intervention", "patient_risk"]
    }
  ]
}
```

### Create Simulation

```http
POST /api/simulations
Authorization: Bearer {token}
Content-Type: application/json

{
  "patient_id": "P001",
  "scenario": "treatment_response",
  "parameters": {
    "treatment": "aggressive",
    "baseline_severity": 8,
    "duration_hours": 24
  }
}
```

**Response:**
```json
{
  "patient_id": "P001",
  "scenario": "treatment_response",
  "results": [
    {
      "hour": 0,
      "severity_score": 8.0,
      "status": "stable"
    },
    {
      "hour": 4,
      "severity_score": 6.8,
      "status": "improving"
    },
    ...
  ],
  "timestamp": "2024-01-15T10:30:00"
}
```

### Get Patient Simulations

```http
GET /simulations/{patient_id}
```

## Health Checks

All services provide health check endpoints:

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "version": "1.0.0"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing rate limiting per user/IP.

## Versioning

API version 1.0.0 is currently deployed. Future versions will be accessible via URL path (e.g., `/v2/api/patients`).

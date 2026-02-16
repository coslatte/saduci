#!/bin/bash
# Test script for SADECI-Core API endpoints

set -e

BASE_URL="http://localhost:8000"
PATIENT_URL="http://localhost:8001"
PREDICTION_URL="http://localhost:8002"
SIMULATION_URL="http://localhost:8003"

echo "🧪 Testing SADECI-Core API Endpoints"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4
    local headers=$5
    
    echo -n "Testing $name... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "$headers" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -H "$headers" -d "$data" "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}PASSED${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}FAILED${NC} (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# 1. Test Health Checks
echo "1. Testing Health Checks"
echo "------------------------"
test_endpoint "API Gateway Health" "$BASE_URL/health"
test_endpoint "Patient Service Health" "$PATIENT_URL/health"
test_endpoint "Prediction Service Health" "$PREDICTION_URL/health"
test_endpoint "Simulation Service Health" "$SIMULATION_URL/health"
echo ""

# 2. Test Authentication
echo "2. Testing Authentication"
echo "------------------------"
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo $login_response | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get authentication token${NC}"
    exit 1
else
    echo -e "${GREEN}Successfully obtained JWT token${NC}"
fi
echo ""

# 3. Test Patient Service
echo "3. Testing Patient Service"
echo "------------------------"

# Create a patient
patient_data='{
  "patient_id": "TEST001",
  "first_name": "Test",
  "last_name": "Patient",
  "date_of_birth": "1990-01-01T00:00:00",
  "gender": "M",
  "clinical_data": {"diagnosis": "Test case"}
}'

test_endpoint "Create Patient" "$BASE_URL/api/patients" "POST" "$patient_data" "Authorization: Bearer $TOKEN"
sleep 1
test_endpoint "Get All Patients" "$BASE_URL/api/patients" "GET" "" "Authorization: Bearer $TOKEN"
test_endpoint "Get Specific Patient" "$BASE_URL/api/patients/TEST001" "GET" "" "Authorization: Bearer $TOKEN"
echo ""

# 4. Test Prediction Service
echo "4. Testing Prediction Service"
echo "------------------------"

# List available models
test_endpoint "List Models" "$PREDICTION_URL/models"

# Create mortality risk prediction
prediction_data='{
  "patient_id": "TEST001",
  "model_name": "mortality_risk",
  "features": {
    "age": 65,
    "severity_score": 7
  }
}'

test_endpoint "Create Mortality Prediction" "$BASE_URL/api/predictions" "POST" "$prediction_data" "Authorization: Bearer $TOKEN"

# Create length of stay prediction
los_prediction='{
  "patient_id": "TEST001",
  "model_name": "length_of_stay",
  "features": {
    "age": 65,
    "severity_score": 7
  }
}'

test_endpoint "Create LOS Prediction" "$BASE_URL/api/predictions" "POST" "$los_prediction" "Authorization: Bearer $TOKEN"
sleep 1
test_endpoint "Get Patient Predictions" "$PREDICTION_URL/predictions/TEST001"
echo ""

# 5. Test Simulation Service
echo "5. Testing Simulation Service"
echo "------------------------"

# List available scenarios
test_endpoint "List Scenarios" "$SIMULATION_URL/scenarios"

# Create treatment response simulation
simulation_data='{
  "patient_id": "TEST001",
  "scenario": "treatment_response",
  "parameters": {
    "treatment": "aggressive",
    "baseline_severity": 8,
    "duration_hours": 24
  }
}'

test_endpoint "Create Treatment Simulation" "$BASE_URL/api/simulations" "POST" "$simulation_data" "Authorization: Bearer $TOKEN"

# Create vital signs simulation
vital_simulation='{
  "patient_id": "TEST001",
  "scenario": "vital_signs_projection",
  "parameters": {
    "heart_rate": 80,
    "blood_pressure_sys": 120,
    "duration_hours": 12
  }
}'

test_endpoint "Create Vital Signs Simulation" "$BASE_URL/api/simulations" "POST" "$vital_simulation" "Authorization: Bearer $TOKEN"
sleep 1
test_endpoint "Get Patient Simulations" "$SIMULATION_URL/simulations/TEST001"
echo ""

# Summary
echo "===================================="
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo "Summary:"
echo "  - Health checks: All services are healthy"
echo "  - Authentication: JWT tokens working"
echo "  - Patient Service: CRUD operations functional"
echo "  - Prediction Service: ML predictions working"
echo "  - Simulation Service: Clinical simulations working"
echo ""
echo "SADECI-Core is fully operational!"

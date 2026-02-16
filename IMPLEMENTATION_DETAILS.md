# SimUCI Integration - Implementation Summary

## Overview

Successfully integrated the [SimUCI](https://github.com/coslatte/simuci) discrete-event simulation engine into the SADECI-Core simulation service to provide realistic ICU patient trajectory modeling.

## What Was Done

### 1. Dependencies Added
- `simuci>=1.0.0` - Core discrete-event simulation engine
- `numpy>=1.26` - Numerical computations
- `pandas>=2.0` - Data manipulation and analysis
- `scipy>=1.11` - Statistical functions
- `simpy>=4.0` - Discrete-event simulation framework
- `scikit-learn>=1.3` - Machine learning for patient clustering

### 2. New Schemas Created
**File:** `shared/schemas/simulation.py`
- `ICUPatientSimulationRequest` - Comprehensive input validation for 13 patient parameters
- `ICUPatientSimulationResponse` - Structured response with simulation results and statistics

### 3. Simulation Engine Implementation
**File:** `services/simulation/main.py`

**New Components:**
- `ICUSimulationEngine` class - Wraps SimUCI functionality
- Handles experiment creation with full parameter validation
- Manages centroid data loading for patient clustering
- Runs multiple replications for statistical confidence
- Computes comprehensive statistics (mean, std, min, max, median)

**New Endpoint:**
- `POST /simulations/icu` - Run real ICU patient simulations

**Updated Endpoint:**
- `GET /scenarios` - Now includes ICU simulation in available scenarios

### 4. API Gateway Updates
**File:** `services/api-gateway/main.py`
- Added routing for `POST /api/simulations/icu`
- Properly handles authentication and forwarding to simulation service

### 5. Centroid Data
**File:** `services/simulation/data/centroids.csv`
- 3 patient clusters with 11 clinical features each
- Used for nearest-centroid patient classification
- Based on age, diagnoses, APACHE score, ventilation parameters

### 6. Documentation
**Files Created/Updated:**
- `SIMUCI_INTEGRATION.md` - Comprehensive integration documentation
- `README.md` - Updated with SimUCI information and examples
- Inline code documentation and comments

## Key Features Implemented

1. **Real-World Accuracy**
   - Based on actual ICU data from research
   - Uses validated simulation methodology
   - Patient clustering for accurate modeling

2. **Statistical Validation**
   - Multiple simulation replications (1-1000)
   - Comprehensive statistics computed
   - Mean, standard deviation, min, max, median
   - Sample results for quick reference

3. **Comprehensive Parameter Validation**
   - Age: 14-100 years
   - APACHE II score: 0-70
   - Diagnosis codes: 0-30 (4 codes)
   - Respiratory insufficiency: 0-8 levels
   - Ventilation type: 0-3 types
   - Stay times: 1-8760 hours (up to 1 year)
   - Percentage parameter: 1-100
   - Replications: 1-1000

4. **Detailed Results**
   - Pre-mechanical ventilation time
   - Mechanical ventilation duration
   - Post-mechanical ventilation time
   - Total ICU stay
   - Post-ICU recovery time

## Testing Results

✓ SimUCI imports successfully
✓ Experiment creation with validation
✓ Single simulation runs correctly
✓ Multiple replications work as expected
✓ Statistical calculations accurate
✓ No security vulnerabilities detected (CodeQL)

**Sample Test Output:**
```
Results shape: (5, 5)
Columns: ['pre_vam', 'vam', 'post_vam', 'uci', 'post_uci']
Mean values:
pre_vam      12.8
vam          46.4
post_vam    122.0
uci         181.2
post_uci    164.8
```

## Code Review Addressed

All code review feedback addressed:
1. ✓ Optimized data conversion using `.head(10)` instead of slicing
2. ✓ Increased time parameter limits from 365 to 8760 hours (~1 year)
3. ✓ Clarified UTI naming (Unidad de Terapia Intensiva = ICU in Spanish)

## API Usage Example

```bash
# Run ICU simulation
curl -X POST "http://localhost:8000/api/simulations/icu" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "age": 55,
    "apache": 20,
    "diagnosis_admission1": 11,
    "diagnosis_admission2": 0,
    "diagnosis_admission3": 0,
    "diagnosis_admission4": 0,
    "respiratory_insufficiency": 5,
    "artificial_ventilation": 1,
    "uti_stay": 100,
    "vam_time": 50,
    "preuti_stay_time": 10,
    "percent": 10,
    "n_replications": 100
  }'
```

## Benefits Over Previous Implementation

| Aspect | Previous | With SimUCI |
|--------|----------|-------------|
| Data Source | Simple mathematical models | Real ICU data and research |
| Patient Classification | None | Nearest-centroid clustering |
| Time Modeling | Linear/exponential decay | Discrete-event simulation |
| Statistical Validation | None | Multiple replications with statistics |
| Result Accuracy | Approximate | Research-validated |
| Clinical Relevance | Low | High |

## Integration with Ecosystem

This implementation mirrors the logic from:
- [SimUCI-Streamlit](https://github.com/coslatte/SimUCI-Streamlit) - Web UI for same simulation engine
- Both use the same `simuci` package
- Compatible parameter validation
- Similar statistical analysis

## Files Changed

1. `services/simulation/requirements.txt` - Added dependencies
2. `services/simulation/main.py` - Implemented ICU simulation engine
3. `services/simulation/data/centroids.csv` - Added cluster data
4. `services/api-gateway/main.py` - Added routing
5. `shared/schemas/simulation.py` - Added new schemas
6. `shared/schemas/__init__.py` - Exported new schemas
7. `README.md` - Updated documentation
8. `SIMUCI_INTEGRATION.md` - Created comprehensive guide

## Security

✓ No vulnerabilities detected by CodeQL
✓ Input validation on all parameters
✓ JWT authentication required for API access
✓ Database records properly stored
✓ Error handling implemented

## Future Enhancements

Potential improvements identified:
1. Integration with prediction service for combined risk assessment
2. Real-time centroid updates based on new patient data
3. Additional statistical validation endpoints
4. Batch simulation for multiple patients
5. Simulation comparison tools
6. Export results to various formats (CSV, PDF, etc.)

## Conclusion

The SimUCI integration successfully transforms the simulation service from using simple mathematical models to employing a research-backed, discrete-event simulation engine with real ICU data. This provides significantly more accurate and clinically relevant patient trajectory predictions.

All tests pass, no security issues detected, and comprehensive documentation provided for users and developers.

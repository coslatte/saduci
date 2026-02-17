# SimUCI Integration Documentation

## Overview

This document describes the integration of [SimUCI](https://github.com/coslatte/simuci) into the SADECI-Core simulation service. SimUCI is an ICU discrete-event simulation engine that provides realistic patient trajectory modeling based on real clinical data.

## Requirements

**Important:** SimUCI requires Python 3.13+. All Docker images and local development environments must use Python 3.13 or higher to support this integration.

## What is SimUCI?

SimUCI is a Python package that:
- Provides discrete-event simulation for ICU patient trajectories
- Uses patient clustering based on clinical features
- Employs statistical distributions derived from real ICU data
- Supports multiple simulation replications for statistical validation
- Includes statistical validation tools (Wilcoxon, Friedman tests, coverage metrics)

The simulation engine is based on research and real-world ICU data, making it significantly more realistic than simple mathematical models.

## Architecture

### Components

1. **SimUCI Engine Wrapper** (`services/simulation/main.py`)
   - `ICUSimulationEngine` class wraps SimUCI functionality
   - Handles experiment creation and execution
   - Manages centroid data loading
   - Computes statistical measures from multiple replications

2. **New API Endpoints**
   - `POST /simulations/icu` - Run ICU patient simulation
   - Updated `GET /scenarios` - Lists available simulation scenarios including ICU

3. **Shared Schemas** (`shared/schemas/simulation.py`)
   - `ICUPatientSimulationRequest` - Input parameters for ICU simulation
   - `ICUPatientSimulationResponse` - Simulation results and statistics

4. **Centroid Data** (`services/simulation/data/centroids.csv`)
   - Contains cluster centroids for patient classification
   - Used by SimUCI for nearest-centroid clustering
   - Based on 11+ clinical features

## API Usage

### Creating an ICU Patient Simulation

**Endpoint:** `POST /api/simulations/icu`

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "patient_id": "P001",
  "age": 55,
  "diagnosis_admission1": 11,
  "diagnosis_admission2": 0,
  "diagnosis_admission3": 0,
  "diagnosis_admission4": 0,
  "apache": 20,
  "respiratory_insufficiency": 5,
  "artificial_ventilation": 1,
  "uti_stay": 100,
  "vam_time": 50,
  "preuti_stay_time": 10,
  "percent": 10,
  "n_replications": 100
}
```

**Parameters:**

| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| `patient_id` | string | - | Unique patient identifier |
| `age` | integer | 14-100 | Patient age in years |
| `diagnosis_admission1` | integer | 0-30 | Primary admission diagnosis code |
| `diagnosis_admission2-4` | integer | 0-30 | Additional admission diagnosis codes |
| `apache` | integer | 0-70 | APACHE II severity score |
| `respiratory_insufficiency` | integer | 0-8 | Respiratory insufficiency severity level |
| `artificial_ventilation` | integer | 0-3 | Type of artificial ventilation |
| `uti_stay` | integer | 1-8760 | Expected ICU stay in hours (UTI = "Unidad de Terapia Intensiva" in Spanish, max ~1 year) |
| `vam_time` | integer | 0-8760 | Mechanical ventilation time in hours (max ~1 year) |
| `preuti_stay_time` | integer | 0-8760 | Pre-ICU stay time in hours (max ~1 year) |
| `percent` | integer | 1-100 | Simulation percentage parameter |
| `n_replications` | integer | 1-1000 | Number of simulation replications |

> **Note**: The parameter name `uti_stay` refers to ICU stay (from Spanish "Unidad de Terapia Intensiva"), not "Urinary Tract Infection". This naming is preserved from the original SimUCI library for consistency.

**Response:**
```json
{
  "patient_id": "P001",
  "simulation_results": {
    "sample_result": {
      "pre_vam": 0,
      "vam": 139,
      "post_vam": 4,
      "uci": 143,
      "post_uci": 79
    },
    "statistics": {
      "mean": {
        "pre_vam": 12.8,
        "vam": 46.4,
        "post_vam": 122.0,
        "uci": 181.2,
        "post_uci": 164.8
      },
      "std": {
        "pre_vam": 8.5,
        "vam": 15.2,
        "post_vam": 25.3,
        "uci": 28.1,
        "post_uci": 42.6
      },
      "min": {...},
      "max": {...},
      "median": {...}
    },
    "n_replications": 100,
    "all_results": [...]
  },
  "statistics": {...},
  "timestamp": "2026-02-16T19:35:00.000Z"
}
```

**Result Fields:**

| Field | Description |
|-------|-------------|
| `pre_vam` | Time before mechanical ventilation (hours) |
| `vam` | Time on mechanical ventilation (hours) |
| `post_vam` | Time after mechanical ventilation (hours) |
| `uci` | Total ICU stay time (hours) |
| `post_uci` | Post-ICU stay time (hours) |

### Example cURL Request

```bash
# Login to get JWT token
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"${AUTH_USERNAME}\", \"password\": \"${AUTH_PASSWORD}\"}"

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

## How It Works

### 1. Patient Classification
SimUCI uses nearest-centroid clustering to classify patients into groups based on clinical features:
- Age
- Diagnosis codes
- APACHE II score
- Respiratory insufficiency
- Ventilation parameters
- Stay times

### 2. Discrete-Event Simulation
The simulation models patient trajectory as a series of discrete events:
- Pre-mechanical ventilation phase
- Mechanical ventilation phase
- Post-mechanical ventilation phase
- ICU stay
- Post-ICU recovery

### 3. Statistical Distributions
Each phase uses statistical distributions derived from real ICU data specific to the patient's cluster.

### 4. Multiple Replications
Running multiple replications provides:
- Statistical confidence in results
- Mean, standard deviation, and range estimates
- Ability to assess variability in outcomes

## Integration with SimUCI-Streamlit

The logic and functionality implemented here mirror the [SimUCI-Streamlit](https://github.com/coslatte/SimUCI-Streamlit) application, which provides a web UI for the same simulation engine. Both use:
- The same `simuci` Python package
- Similar patient parameter validation
- Comparable statistical analysis
- Compatible centroid data format

## Dependencies

The simulation service now includes:
- `simuci>=1.0.0` - Core simulation engine
- `numpy>=1.26` - Numerical computations
- `pandas>=2.0` - Data manipulation
- `scipy>=1.11` - Statistical functions
- `simpy>=4.0` - Discrete-event simulation framework
- `scikit-learn>=1.3` - Machine learning (clustering)

## Centroid Data

The `data/centroids.csv` file contains cluster centroids used for patient classification. The file format:
- First column: Cluster ID (0, 1, 2, ...)
- Remaining columns: Feature values for each cluster
- Minimum 11 numeric columns required

To use your own centroid data:
1. Prepare a CSV file with the correct format
2. Replace `services/simulation/data/centroids.csv`
3. Restart the simulation service

## Benefits Over Previous Implementation

The SimUCI integration provides:

1. **Real-world accuracy** - Based on actual ICU data and research
2. **Patient clustering** - Groups similar patients for better predictions
3. **Statistical validation** - Multiple replications with confidence measures
4. **Discrete-event modeling** - More realistic time progression
5. **Research-backed** - Validated simulation methodology
6. **Comprehensive results** - Detailed trajectory with multiple phases

## References

- [SimUCI Repository](https://github.com/coslatte/simuci)
- [SimUCI-Streamlit Application](https://github.com/coslatte/SimUCI-Streamlit)
- [SimUCI Documentation](https://github.com/coslatte/simuci/tree/main/docs)

## Future Enhancements

Potential improvements:
1. Integration with prediction service for combined risk assessment
2. Real-time centroid updates based on new patient data
3. Additional statistical validation endpoints
4. Batch simulation for multiple patients
5. Simulation comparison tools
6. Export results to various formats

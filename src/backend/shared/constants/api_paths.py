API_BASE_URL = "http://localhost:8000"

HEALTH = "/health"

AUTH_LOGIN = "/auth/login"
AUTH_REGISTER = "/auth/register"
AUTH_ME = "/auth/me"
AUTH_CHANGE_PASSWORD = "/auth/change-password"

PREDICTIONS = "/api/predictions"
PREDICTIONS_MODELS = "/api/predictions/models"
PREDICTIONS_BY_PATIENT = "/api/predictions/{patient_id}"
PREDICCION = "/prediccion"
PREDICCION_EXPLAIN = "/prediccion/explain"

PREDICTION_SERVICE_PREDICTIONS = "/predictions"
PREDICTION_SERVICE_PREDICTION = "/prediction"
PREDICTION_SERVICE_PREDICCION = "/prediccion"
PREDICTION_SERVICE_PREDICTION_EXPLAIN = "/prediction/explain"
PREDICTION_SERVICE_PREDICCION_EXPLAIN = "/prediccion/explain"
PREDICTION_SERVICE_PREDICTIONS_BY_PATIENT = "/predictions/{patient_id}"
PREDICTION_SERVICE_MODELS = "/models"

SIMULATIONS = "/api/simulations"
SIMULATIONS_SCENARIOS = "/api/simulations/scenarios"
SIMULATIONS_BY_PATIENT = "/api/simulations/{patient_id}"
SIMULATIONS_ICU = "/api/simulations/icu"
SIM = "/sim"

SIMULATION_SERVICE_SIMULATIONS = "/simulations"
SIMULATION_SERVICE_SIMULATIONS_BY_PATIENT = "/simulations/{patient_id}"
SIMULATION_SERVICE_SCENARIOS = "/scenarios"
SIMULATION_SERVICE_SIMULATIONS_ICU = "/simulations/icu"
SIMULATION_SERVICE_SIMULATION = "/simulation"

STATS_WILCOXON = "/stats/wilcoxon"
STATS_FRIEDMAN = "/stats/friedman"
STATISTICS_WILCOXON = "/statistics/wilcoxon"
STATISTICS_FRIEDMAN = "/statistics/friedman"

ADMIN_USERS = "/admin/users"
ADMIN_USERS_BY_ID = "/admin/users/{user_id}"

USERS_API = "/api/users"
USERS_API_BY_ID = "/api/users/{user_id}"
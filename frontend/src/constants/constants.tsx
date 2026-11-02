import React from "react";

// Centralized UI strings, labels and defaults
export const APP_NAME = "Saduci Platform";

// Login
export const LOGIN_DEFAULT_EMAIL = "";
// WARNING: Do not set any real default password here. This constant must not be
// used for authentication in production; prefer environment variables or config.
export const LOGIN_DEFAULT_PASSWORD = "";

export const LOGIN_PROMPT = "Inicie sesión con su usuario administrador";
export const LOGIN_BUTTON = "Iniciar sesión";
export const LOGIN_HELP_TEXT =
  "El acceso depende del backend de saduci-core activo.";
export const LOGIN_ERROR_MSG =
  "No se pudo iniciar sesión. Verifique sus credenciales.";
export const LOGIN_EMAIL_LABEL = "Usuario o correo electrónico";
export const LOGIN_EMAIL_PLACEHOLDER = "admin o admin@saduci.com";
export const LOGIN_PASSWORD_LABEL = "Contraseña";
export const LOGIN_PASSWORD_PLACEHOLDER = "••••••••";
export const LOGIN_REGISTER_LINK = "Crear nuevo usuario";

// Register
export const REGISTER_PROMPT = "Crear nuevo usuario";
export const REGISTER_BUTTON = "Crear usuario";
export const REGISTER_ERROR_MSG =
  "No se pudo crear el usuario. Intente de nuevo.";
export const REGISTER_SUCCESS_MSG =
  "Usuario creado exitosamente. Redirigiendo...";
export const REGISTER_EMAIL_LABEL = "Correo electrónico";
export const REGISTER_EMAIL_PLACEHOLDER = "usuario@ejemplo.com";
export const REGISTER_PASSWORD_LABEL = "Contraseña";
export const REGISTER_PASSWORD_PLACEHOLDER = "••••••••";
export const REGISTER_CONFIRM_PASSWORD_LABEL = "Confirmar contraseña";
export const REGISTER_CONFIRM_PASSWORD_PLACEHOLDER = "••••••••";
export const REGISTER_ROLE_LABEL = "Seleccionar rol";
export const REGISTER_ROLE_PLACEHOLDER = "Seleccione un rol";
export const REGISTER_ROLE_MEDICO = "Médico";
export const REGISTER_ROLE_ADMIN = "Administrador";
export const REGISTER_PASSWORD_MISMATCH = "Las contraseñas no coinciden";
export const REGISTER_PASSWORD_MIN_LENGTH =
  "La contraseña debe tener al menos 8 caracteres";
export const REGISTER_INVALID_EMAIL = "Correo electrónico inválido";
export const REGISTER_ROLE_REQUIRED = "Debe seleccionar un rol";
export const REGISTER_LOGIN_LINK = "¿Ya tienes cuenta? Inicia sesión";

// Simulation page
export const SIMULATION_PAGE_TITLE = "Simulación de Paciente UCI";
export const SIMULATION_PAGE_SUBTITLE =
  "Ingrese los datos clínicos del paciente para simular su evolución en la Unidad de Cuidados Intensivos.";

export const ID_PATIENT_LABEL = "ID Paciente";
export const NEW_PATIENT_BUTTON = "Nuevo paciente";
export const SIMULATION_PATIENT_SECTION_TITLE = "Datos del Paciente";
export const SIMULATION_METRICS_SECTION_TITLE =
  "Demográficos, tiempos y puntajes clínicos";
export const DEMOGRAPHICS_TITLE = "Demográficos & Tiempos";
export const CLINICAL_SCORES_TITLE = "Puntajes Clínicos";
export const VENTILATION_TITLE = "Ventilación Mecánica";
export const DIAGNOSES_TITLE = "Diagnósticos de Ingreso y Egreso";
export const SIMULATION_CONFIG_TITLE = "Configuración de Simulación";
export const RUNS_LABEL = "Corridas de la Simulación";
export const SIMULATE_BUTTON = "Realizar Simulación";
export const SIMULATION_CANCEL_BUTTON = "Cancelar simulación";
export const SIMULATION_CANCEL_COOLDOWN_LABEL = (seconds: number) =>
  `Enfriamiento activo: ${seconds}s`;
export const SIMULATION_LONG_RUN_WARNING_TITLE = "Simulación extensa detectada";
export const SIMULATION_LONG_RUN_WARNING_DESCRIPTION =
  "Más de 10,000 iteraciones pueden tardar varios minutos. La simulación continuará hasta completar el proceso.";
export const SIMULATION_PROGRESS_TITLE = "Progreso de simulación";
export const SIMULATION_PROGRESS_RUNNING =
  "Ejecutando simulación, por favor espere...";
export const SIMULATION_PROGRESS_ELAPSED_PREFIX = "Transcurrido:";
export const SIMULATION_PROGRESS_ESTIMATED_PREFIX = "Estimado:";
export const SIMULATION_PROGRESS_PERCENT_PREFIX = "Avance estimado:";
export const SIMULATION_CANCELLED_MESSAGE =
  "La simulación fue cancelada por el usuario.";
export const DOWNLOAD_CSV = "Descargar CSV";
export const ERROR_SIMULATION_TITLE = "Error en la simulación";
export const ALERT_ERROR_TITLE = "Error";
export const SIMULATION_RESULTS_TITLE = "Resultados de la Simulación";
export const SIMULATION_RESULTS_RUN_HISTORY = "Historial de ejecuciones";
export const SIMULATION_PAGINATION_PREVIOUS = "Anterior";
export const SIMULATION_PAGINATION_NEXT = "Siguiente";
export const SIMULATION_RESULTS_PAGE_SUMMARY = (
  current: number,
  total: number,
) => `Ejecución ${current} de ${total}`;
export const MODEL_PREDICTION_TITLE = "Predicción del modelo";
export const PATIENT_SURVIVES = "Paciente no fallece";
export const PATIENT_DIES = "Paciente fallece";
export const PROB_DIE_PREFIX = "Probabilidad de fallecer: ";
export const SIMULATION_AGE_LABEL = "Edad";
export const SIMULATION_PREUTI_STAY_LABEL = "Tiempo en Pre-UCI (h)";
export const SIMULATION_APACHE_LABEL = "APACHE";
export const SIMULATION_SIM_PERCENT_LABEL = "Porciento Tiempo UCI";
export const SIMULATION_VAM_TIME_LABEL = "Tiempo en VA (h)";
export const SIMULATION_UTI_STAY_LABEL = "Tiempo en UCI (h)";
export const SIMULATION_DIAG_ING_LABEL = (index: number) =>
  `Diag. Ingreso ${index}`;
export const SIMULATION_RESP_INSUF_LABEL = "Insuf. Respiratoria";
export const SIMULATION_VENT_TYPE_LABEL = "Ventilación Artificial";
export const SIMULATION_DIAG_DISCHARGE_LABEL = "Diagnóstico Egreso 2";

// Helper for formatted runs text
export function runsRangeText(min: number, max: number) {
  return `Mínimo ${min} — máximo ${max.toLocaleString()} iteraciones`;
}

>>>>>>> agents/login-skip-authentication
// Navigation & UI
export const NAV_BRAND_SHORT = "Saduci";
export const NAVBAR_OPEN_NAVIGATION = "Abrir navegación";

// Shared prediction/simulation result labels (used in 3+ files)
export const PATIENT_SURVIVES = "Paciente no fallece";
export const PATIENT_DIES = "Paciente fallece";

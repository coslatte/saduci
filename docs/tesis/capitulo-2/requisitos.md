# Especificación de Requisitos SADUCI

> Basado en estándar **IEEE 830-1998** — Adaptado para la plataforma SADUCI

---

## 1. Introducción

### 1.1 Propósito

Este documento establece la especificación completa de requisitos para el sistema **SADUCI** (Sistema de Ayuda a la Decisión en la Unidad de Cuidados Intensivos), desarrollado para el Hospital Universitario Arnaldo Milián Castro. El sistema proporciona herramientas de predicción clínica y simulación basadas en modelos de inteligencia artificial que ayudan al personal médico en la valoración clínica y la toma de decisiones en la UCI.

### 1.2 Alcance

SADUCI es una plataforma web modular que permite:
- **Predicción de riesgo de mortalidad** mediante modelos de aprendizaje automático entrenados con datos históricos de pacientes de UCI
- **Simulación de escenarios clínicos** utilizando el motor SimUCI para proyección de desenlaces
- **Visualización de explicaciones** de predicciones mediante técnicas XAI (SHAP, LIME)

### 1.3 Definiciones, Acrónimos y Abreviaturas

| Término | Definición |
|---------|-----------|
| SADUCI | Sistema de Ayuda a la Decisión en la Unidad de Cuidados Intensivos |
| UCI | Unidad de Cuidados Intensivos |
| MLSS | Medical Learning & Simulation Service |
| CDSS | Clinical Decision Support System |
| XAI | Explainable Artificial Intelligence |
| APACHE II | Acute Physiology and Chronic Health Evaluation II |
| SimUCI | Simulator for Intensive Care Units |
| BFF | Backend for Frontend |
| RSC | React Server Components |

---

## 2. Actores del Sistema

### 2.1 Actor Primario: Personal Médico (Médico)

| Atributo | Descripción |
|----------|-------------|
| **Identificador** | ACT-001 |
| **Nombre** | Personal Médico (Médico) |
| **Descripción** | Profesional de la salud que utiliza SADUCI para consultar predicciones de riesgo, simulaciones de escenarios y gestionar información de pacientes |
| **Responsabilidades** | Ingresar datos del paciente, consultar predicciones, revisar explicaciones de modelos, interpretar simulaciones |
| **Frecuencia de uso** | Alta — múltiples sesiones diarias |
| **Prioridad** | Crítica |

**Casos de uso asociados:**
- CU-001: Visualizar riesgo de mortalidad
- CU-002: Solicitar explicación de predicción
- CU-003: Ejecutar simulación de escenario clínico
- CU-004: Consultar estadísticas de pruebas diagnósticas
- CU-005: Gestionar pacientes

### 2.2 Actor Secundario: Administrador

| Atributo | Descripción |
|----------|-------------|
| **Identificador** | ACT-002 |
| **Nombre** | Administrador |
| **Descripción** | Usuario con privilegios de gestión de infraestructura, configuración de microservicios y gestión de usuarios |
| **Responsabilidades** | Gestionar cuentas de usuario, configurar servicios, monitorizar sistema |
| **Frecuencia de uso** | Media — sesiones periódicas |
| **Prioridad** | Alta |

**Casos de uso asociados:**
- CU-006: Gestionar usuarios del sistema
- CU-007: Configurar proveedores de narrativa IA
- CU-008: Monitorear estado de servicios

---

## 3. Requisitos Funcionales

### 3.1 Gestión de Pacientes

| ID | Requisito | Prioridad | Caso de Uso |
|----|-----------|-----------|------------|
| **RF-001** | El sistema debe permitir al médico consultar la información de un paciente existente mediante su identificador único | Alta | CU-005 |
| **RF-002** | El sistema debe almacenar el historial de predicciones asociadas a cada paciente | Alta | CU-001 |
| **RF-003** | El sistema debe validar que los datos demográficos del paciente estén dentro de rangos clínicos válidos (edad 14-100 años) | Crítica | CU-005 |

### 3.2 Predicción Clínica

| ID | Requisito | Prioridad | Caso de Uso | Correlato Arquitectónico |
|----|-----------|-----------|------------|-------------------------|
| **RF-004** | El sistema debe calcular el riesgo de mortalidad de un paciente utilizando el modelo entrenado `new_workflow.joblib` | Crítica | CU-001 | Prediction Service → POST /prediccion |
| **RF-005** | El sistema debe devolver la probabilidad de no supervivencia como valor continuo (0-1) junto con la clase predicha (vive/muere) | Crítica | CU-001 | Prediction Service → Pipeline imblearn |
| **RF-006** | El sistema debe soportar modelos de predicción de estancia hospitalaria (length_of_stay) | Media | CU-001 | Prediction Service → modelo configurable |
| **RF-007** | El sistema debe soportar modelos de predicción de reingreso (readmission_risk) | Media | CU-001 | Prediction Service → modelo configurable |

### 3.3 Explainability (XAI)

| ID | Requisito | Prioridad | Caso de Uso | Correlato Arquitectónico |
|----|-----------|-----------|------------|-------------------------|
| **RF-008** | El sistema debe generar explicaciones por特征 para cada predicción, indicando la contribución individual de cada variable al resultado | Crítica | CU-002 | Prediction Service → POST /prediccion/explain |
| **RF-009** | El sistema debe soportar los métodos de explicación: LIME, SHAP, Gradientes Integrados y Mapas de Saliencia | Alta | CU-002 | prediction.py → PlatformExplanationRequest.method |
| **RF-010** | El sistema debe incluir un valor basal (baseline) para cada feature que permita comparar la contribución del valor observado | Alta | CU-002 | PlatformFeatureExplanationRow.baseline_value |
| **RF-011** | El sistema debe indicar la dirección del riesgo (increase/decrease/neutral) para cada feature | Alta | CU-002 | PlatformFeatureExplanationRow.direction |
| **RF-012** | El sistema debe generar narrativas clínicas opcionales mediante proveedor de IA configurable (stub, local LLM, Gemini, HuggingFace) | Media | CU-002 | Prediction Service → PREDICTION_NARRATIVE_PROVIDER |

### 3.4 Simulación Clínica

| ID | Requisito | Prioridad | Caso de Uso | Correlato Arquitectónico |
|----|-----------|-----------|------------|-------------------------|
| **RF-013** | El sistema debe ejecutar simulaciones de escenarios clínicos utilizando el motor SimUCI cuando esté disponible | Alta | CU-003 | Simulation Service → POST /simulations/icu |
| **RF-014** | El sistema debe ejecutar un fallback estadístico determinista cuando SimUCI no esté disponible | Alta | CU-003 | Simulation Service → fallback SHA-256 seed |
| **RF-015** | El sistema debe devolver estadísticas de salida de simulación (mean, std, min, max, median, CI 95%) | Alta | CU-003 | TimeStats model → ICUPatientSimulationResponse |
| **RF-016** | El sistema debe permitir configurar el número de replicaciones de simulación (n_runs: 50-100000) | Media | CU-003 | ICUPatientSimulationRequest.n_runs |

### 3.5 Pruebas Estadísticas

| ID | Requisito | Prioridad | Caso de Uso | Correlato Arquitectónico |
|----|-----------|-----------|------------|-------------------------|
| **RF-017** | El sistema debe ejecutar la prueba de Mann-Whitney-Wilcoxon para comparación de muestras | Media | CU-004 | Simulation Service → POST /statistics/wilcoxon |
| **RF-018** | El sistema debe ejecutar la prueba de Friedman para comparación de múltiples grupos relacionados | Media | CU-004 | Simulation Service → POST /statistics/friedman |
| **RF-019** | El sistema debe devolver el estadístico y p-value para cada prueba | Media | CU-004 | statistics.py → response schemas |

### 3.6 Autenticación y Autorización

| ID | Requisito | Prioridad | Caso de Uso | Correlato Arquitectónico |
|----|-----------|-----------|------------|-------------------------|
| **RF-020** | El sistema debe autenticar usuarios mediante credenciales (email/password) | Crítica | — | API Gateway → POST /auth/login |
| **RF-021** | El sistema debe generar y validar tokens JWT para sesiones autenticadas | Crítica | — | API Gateway → JWT auth |
| **RF-022** | El sistema debe proteger rutas internas con middleware de autorización Bearer | Crítica | — | API Gateway → Internal routes |
| **RF-023** | El sistema debe exponer rutas públicas específicas para la plataforma web (sin JWT) | Alta | — | API Gateway → /prediccion, /simulation |
| **RF-024** | El sistema debe distinguir roles de usuario (médico, desarrollador, SYSTEM ADMIN) | Alta | — | AuthContext → role distribution |

---

## 4. Requisitos No Funcionales

### 4.1 Disponibilidad

| ID | Requisito | Métrica | Prioridad |
|----|-----------|---------|----------|-----------|
| **RNF-001** | El sistema debe estar disponible para consultas de predicción las 24 horas del día | 99.5% uptime mensual | Crítica |
| **RNF-002** | El sistema debe implementar health checks por cada microservicio para detección de fallos | `/health` endpoint por servicio | Alta |
| **RNF-003** | El sistema debe reiniciar servicios automáticamente ante caídas no programadas | Docker Compose restart: unless-stopped | Alta |

### 4.2 Rendimiento y Latencia

| ID | Requisito | Métrica | Prioridad |
|----|-----------|---------|----------|-----------|
| **RNF-004** | El tiempo de respuesta para inferencia de predicción no debe exceder 2 segundos | P95 < 2000ms | Crítica |
| **RNF-005** | El sistema debe procesar múltiples solicitudes concurrentes mediante arquitectura de microservicios | > 50 req/s por instancia | Alta |
| **RNF-006** | La carga de la interfaz web debe completarse en menos de 3 segundos en condiciones normales | First Contentful Paint < 3s | Media |

### 4.3 Escalabilidad

| ID | Requisito | Métrica | Prioridad |
|----|-----------|---------|----------|-----------|
| **RNF-007** | El sistema debe escalar horizontalmente mediante la adición de contenedores Docker | Container orchestration ready | Alta |
| **RNF-008** | Los servicios de ML (CPU-bound) deben poder escalarse independientemente de los servicios web (I/O-bound) | Separación de cargas | Alta |
| **RNF-009** | Cada microservicio debe mantener su propia base de datos PostgreSQL para evitar acoplamiento | Database per Service pattern | Alta |

### 4.4 Seguridad

| ID | Requisito | Métrica | Prioridad |
|----|-----------|---------|----------|-----------|
| **RNF-010** | Los datos de pacientes deben transmitirse exclusivamente mediante HTTPS | TLS 1.2+ | Crítica |
| **RNF-011** | Los tokens JWT deben tener una vigencia máxima de 24 horas | Expiración configurada | Alta |
| **RNF-012** | Las bases de datos internas no deben estar expuestas directamente a redes públicas | Aislamiento en Docker network | Alta |
| **RNF-013** | El sistema debe validar todos los inputs de datos clínicos contra esquemas Pydantic | Type safety + range validation | Crítica |

### 4.5 Mantenibilidad

| ID | Requisito | Métrica | Prioridad |
|----|-----------|---------|----------|-----------|
| **RNF-014** | El sistema debe utilizar React Server Components por defecto para optimizar el renderizado inicial | RSC first approach | Media |
| **RNF-015** | El código frontend debe mantener cobertura de tests superior a 300 componentes | bun test > 300 passes | Alta |
| **RNF-016** | Los componentes deben seguir Atomic Design (atoms, molecules, organisms, layouts) | Estructura de componentes | Alta |

---

## 5. Reglas de Negocio

| ID | Regla | Descripción |
|----|-------|-------------|
| **RN-001** | Validez de edad | La edad del paciente debe estar entre 14 y 100 años |
| **RN-002** | Validez de APACHE II | El score APACHE II debe estar entre 0 y 70 |
| **RN-003** | Validez de estancia en UCI | La estancia en UCI no debe exceder 8760 horas (~1 año) |
| **RN-004** | Validez de ventilación mecánica | El tiempo de ventilación mecánica no debe exceder la estancia en UCI |
| **RN-005** | Categorización de riesgo | Si probability >= threshold (default 0.5) → predecir "muere", sino "vive" |
| **RN-006** | Contexto clínico | SADUCI no es para pacientes abiertos; el manejo de errores debe ser clínico (no ocultar fallos atípicos) |

---

## 6. Dependencias Externas

| ID | Dependencia | Versión | Propósito |
|----|-------------|--------|-----------|
| **DEP-001** | scikit-learn | 1.6.1 | Pipeline de modelos de predicción |
| **DEP-002** | imbalanced-learn | — | Manejo de desbalance en datos médicos |
| **DEP-003** | joblib | — | Serialización de modelos entrenados |
| **DEP-004** | SimUCI | — | Motor de simulación clínica (opcional, fallback disponible) |
| **DEP-005** | PostgreSQL | — | Persistencia por microservicio |
| **DEP-006** | Docker/Docker Compose | — | Contenedores y orquestación |

---

## 7. Suposiciones y Dependencias

1. Los datos de entrenamiento del modelo `new_workflow.joblib` provienen del Hospital Arnaldo Milián Castro
2. El modelo fue entrenado con datos de pacientes adultos de UCI (edad >= 14 años)
3. Se asume conectividad de red entre los componentes del sistema
4. Los recursos computacionales suficientes están disponibles para inferencia de modelos
5. El acceso a la plataforma está restringido a personal clínico autenticado

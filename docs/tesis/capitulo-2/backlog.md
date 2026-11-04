# Product Backlog SADUCI — Hospital Arnaldo Milián Castro

> Basado en metodología Scrum. Los elementos se priorizan según el marco MoSCoW.

---

## Historias de Usuario

### Prioridad Crítica (Must Have)

| ID | Historia de Usuario | Criterios de Aceptación | Effort | Prioridad |
|----|---------------------|-------------------------|--------|-----------|
| **HU-001** | Como **médico**, quiero visualizar el riesgo de mortalidad de un paciente para tomar decisiones clínicas informadas | - Ingresar datos del paciente (edad, diagnósticos, APACHE II, etc.)<br>- Recibir probabilidad de no supervivencia<br>- Ver resultado binario (vive/muere)<br>- Umbral configurable | 8 | MoSCoW: Must |
| **HU-002** | Como **médico**, quiero ver explicaciones de las predicciones para confiar en las recomendaciones del sistema | - Ver contribución individual de cada variable<br>- Comparar con valor basal<br>- Identificar dirección del riesgo<br>- Método de explicación seleccionable | 13 | MoSCoW: Must |
| **HU-003** | Como **médico**, quiero autenticarme de forma segura en la plataforma para acceder a datos de pacientes | - Ingresar email y contraseña<br>- Recibir token JWT<br>- Mantener sesión activa<br>- Ver rol del usuario | 5 | MoSCoW: Must |
| **HU-004** | Como **médico**, quiero ejecutar simulaciones de escenarios clínicos para proyectar desenlaces | - Ingresar parámetros del paciente<br>- Ejecutar SimUCI o fallback<br>- Ver estadísticas (mean, std, CI 95%)<br>- Configurar número de replicaciones | 13 | MoSCoW: Must |
| **HU-005** | Como **administrador**, quiero gestionar usuarios del sistema para controlar el acceso | - Crear nuevos usuarios<br>- Asignar roles (médico/admin)<br>- Activar/desactivar usuarios<br>- Restablecer contraseñas | 8 | MoSCoW: Must |

### Prioridad Alta (Should Have)

| ID | Historia de Usuario | Criterios de Aceptación | Effort | Prioridad |
|----|---------------------|-------------------------|--------|-----------|
| **HU-006** | Como **médico**, quiero generar narrativas clínicas automáticas para facilitar la documentación | - Habilitar generación de narrativa<br>- Seleccionar proveedor (local, Gemini, HuggingFace)<br>- Recibir texto explicativo<br>- Ajustar temperatura de generación | 13 | MoSCoW: Should |
| **HU-007** | Como **médico**, quiero consultar pruebas estadísticas para validar resultados clínicos | - Ejecutar prueba de Wilcoxon<br>- Ejecutar prueba de Friedman<br>- Ver estadístico y p-value<br>- Interpretar resultados | 8 | MoSCoW: Should |
| **HU-008** | Como **médico**, quiero visualizar gráficos de estadísticas para interpretar datos agregados | - Ver gráficos de evaluaciones<br>- Renderizar con Recharts<br>- Interactuar con datos<br>- Exportar visualizaciones | 5 | MoSCoW: Should |

### Prioridad Media (Could Have)

| ID | Historia de Usuario | Criterios de Aceptación | Effort | Prioridad |
|----|---------------------|-------------------------|--------|-----------|
| **HU-009** | Como **médico**, quiero predecir la estancia hospitalaria para planificar el alta | - Ingresar datos del paciente<br>- Recibir predicción de días de estancia<br>- Ver factores influyentes | 8 | MoSCoW: Could |
| **HU-010** | Como **médico**, quiero predecir el riesgo de reingreso para gestionar recidivas | - Ingresar datos del paciente<br>- Recibir probabilidad de reingreso<br>- Ver factores de riesgo | 8 | MoSCoW: Could |
| **HU-011** | Como **administrador**, quiero monitorear el estado de los servicios para garantizar disponibilidad | - Ver health checks por servicio<br>- Alertar ante caídas<br>- Ver métricas de uso | 5 | MoSCoW: Could |
| **HU-012** | Como **médico**, quiero gestionar pacientes de forma centralizada | - Buscar pacientes<br>- Ver historial de predicciones<br>- Asociar predicciones a episodios | 8 | MoSCoW: Could |

### Prioridad Baja (Won't Have — Fase 2+)

| ID | Historia de Usuario | Notas | Prioridad |
|----|---------------------|-------|-----------|
| **HU-013** | Como **médico**, quiero integrar con sistemas HIS del hospital | Depende de API del hospital | Won't Have |
| **HU-014** | Como **administrador**, quiero recibir alertas proactivas de anomalías | Fase posterior | Won't Have |
| **HU-015** | Como **médico**, quiero colaborar en tiempo real con colegas | Fase posterior | Won't Have |

---

## Sprint 1: MVP de Predicción y Simulación

### Objetivo del Sprint
Entregar un sistema funcional que permita al personal médico realizar predicciones de mortalidad y simulaciones básicas de escenarios clínicos.

### Duración
4 semanas (Basado en desarrollo real documentado en CHANGELOGs)

### Sprint Backlog

| ID | Elemento | Tipo | Estimación | Estado |
|----|----------|------|-----------|--------|
| SP1-001 | Configurar infraestructura Docker Compose | Tarea | 2d | ✓ Completado |
| SP1-002 | Implementar API Gateway con autenticación JWT | Tarea | 5d | ✓ Completado |
| SP1-003 | Implementar Prediction Service con modelo mortality_risk | Tarea | 8d | ✓ Completado |
| SP1-004 | Implementar Simulation Service con SimUCI/fallback | Tarea | 8d | ✓ Completado |
| SP1-005 | Implementar endpoints de explainability (SHAP/LIME) | Tarea | 5d | ✓ Completado |
| SP1-006 | Crear frontend React con Next.js 16 | Tarea | 8d | ✓ Completado |
| SP1-007 | Implementar sistema de autenticación en frontend | Tarea | 3d | ✓ Completado |
| SP1-008 | Integrar endpoints de predicción y simulación | Tarea | 5d | ✓ Completado |
| SP1-009 | Testing: cobertura > 300 componentes | Tarea | 5d | ✓ Completado |

**Total estimado:** 57d (equivalente a ~11 semanas persona)

### Incremento de Software Resultante (v1.0.0)

- API Gateway funcionando con JWT y health checks
- Prediction Service con modelo `new_workflow.joblib` cargado
- Simulation Service con SimUCI y fallback determinista
- Frontend Next.js 16 con Atomic Design
- Sistema de autenticación con roles (médico, admin)
- Suite de tests: 324 pruebas pasando

---

## Tabla de Priorización MoSCoW

```
┌──────────────────────────────────────────────────────┐
│  MoSCoW     │ # HU  │ %      │ Descripción          │
├─────────────┼───────┼────────┼──────────────────────┤
│  Must       │   5   │ 33.33% │ Funcionalidad crítica │
│  Should     │   3   │ 20.00% │ Funcionalidad import. │
│  Could      │   4   │ 26.67% │ Funcionalidad nice   │
│  Won't Have │   3   │ 20.00% │ Reservado para F2+   │
├─────────────┼───────┼────────┼──────────────────────┤
│  TOTAL      │  15   │ 100%   │                      │
└──────────────────────────────────────────────────────┘
```

---

## Vinculación Historias de Usuario → Requisitos Funcionales

| HU | RF Asociados |
|----|--------------|
| HU-001 | RF-001, RF-002, RF-003, RF-004, RF-005 |
| HU-002 | RF-008, RF-009, RF-010, RF-011, RF-012 |
| HU-003 | RF-020, RF-021, RF-022, RF-023, RF-024 |
| HU-004 | RF-013, RF-014, RF-015, RF-016 |
| HU-005 | ACT-002, RF-020, RF-021 |
| HU-006 | RF-012 |
| HU-007 | RF-017, RF-018, RF-019 |
| HU-008 | RNF-006 |
| HU-009 | RF-006 |
| HU-010 | RF-007 |
| HU-011 | RNF-001, RNF-002, RNF-003 |
| HU-012 | RF-001, RF-002 |

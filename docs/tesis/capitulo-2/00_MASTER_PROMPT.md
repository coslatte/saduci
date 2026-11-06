# Master Prompt: Capítulo 2 — SADUCI

## Instrucciones para Agente IA

Este documento es el punto de partida para que un agente de IA genere el contenido formal del **Capítulo 2: Ingeniería de Requisitos y Diseño** de la tesis SADUCI.

---

## Información del Proyecto

- **Plataforma:** SADUCI (Sistema de Ayuda a la Decisión en la Unidad de Cuidados Intensivos)
- **Institución:** Hospital Universitario Arnaldo Milián Castro
- **Tipo de documento:** Capítulo de tesis de grado
- **Tono:** Académico, técnico y propositivo (APA 7)
- **Idioma:** Español

---

## Estructura del Capítulo

### 2.1 Comprensión de la Lógica del Sistema (MLSS)

- Definir SADUCI como **Medical Learning & Simulation Service (MLSS)**
- Explicar el flujo de valor: doctores crean instancias de simulación → predicción de desenlaces (mortalidad, supervivencia)
- Lógica de datos: datos sintéticos + datos reales → modelos predictivos

### 2.2 Ingeniería de Requisitos

- Marco: Scrum sobre metodologías tradicionales
- Actores identificados:
  - Personal Médico (Doctores): Consumidores de predicciones y gestores de pacientes
  - Administradores: Gestión de infraestructura, usuarios y configuración de microservicios
- Requisitos Funcionales (IEEE 830):
  - Gestión de pacientes
  - Ejecución de modelos predictivos
  - Visualización de alertas tempranas
- Requisitos No Funcionales:
  - Alta disponibilidad
  - Escalabilidad (microservicios)
  - Seguridad de datos sensibles
  - Latencia mínima en inferencia

### 2.3 Gestión Ágil (Backlog y Sprints)

- Product Backlog basado en necesidades del Hospital Arnaldo Milián Castro
- Tabla de Historias de Usuario priorizadas
- Ejecución de Sprint 1 (consultar changelogs reales)

### 2.4 Arquitectura y Diseño de Software

- Patrones: Microservicios, API Gateway, BFF, Database per Service
- Stack: Next.js 16/React 19 (frontend), FastAPI/Python (ML services), Node.js (orquestación), Docker

---

## Referencias Bibliográficas Requeridas

- Shortliffe & Cimino (2014) — Base de CDSS
- Sutton et al. (2020) — Taxonomía funcional de CDSS
- IEEE 830-1998 — Estándar de especificación de requisitos
- Scrum Guide (Schwaber & Sutherland) — Marco ágil

---

## Convenciones de Escritura

1. **SADUCI** es el nombre oficial — nunca "SADECI" o variaciones en el texto de tesis
2. Cada requisito funcional debe vincularse a un componente arquitectónico
3. Usar formato APA 7 para todas las citas
4. Diagramas en formato Mermaid (para generación automática)
5. Código y endpoints en bloques monoespaciados

---

## Archivos de Apoyo

Todos los archivos de referencia están en `writings/capitulo-2/`:

| Archivo | Descripción |
|---------|-------------|
| `requisitos.md` | Especificación completa IEEE 830 |
| `backlog.md` | Product Backlog e Historias de Usuario |
| `sprints.md` | Ejecución de Sprint 1 |
| `arquitectura.md` | Diseño arquitectónico detallado |
| `modelo_datos.md` | Esquemas de datos y relaciones |
| `api_contratos.md` | Contratos de API REST |
| `diagramas/` | Diagramas Mermaid (uml/, flujo/, secuencia/) |

---

## Ejemplo de Enlace Requisito → Arquitectura

```
RF-001: El sistema debe permitir al médico visualizar el riesgo de mortalidad
→ Correlato arquitectónico: Microservicio Prediction Service (saduci-core/services/prediction)
→ Endpoint: POST /prediccion
→ Modelo: new_workflow.joblib (mortality_risk)
```

---

## Próximo Paso

Comenzar redacción de **sección 2.1 (Lógica del Sistema y MLSS)** utilizando los archivos de apoyo en `writings/capitulo-2/`.

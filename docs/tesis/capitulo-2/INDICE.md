# Índice de Documentación — Capítulo 2 SADUCI

## Archivos del Capítulo

```
writings/capitulo-2/
├── 00_MASTER_PROMPT.md          ← Punto de entrada para agentes IA
├── 01_requisitos.md             ← Especificación IEEE 830
├── 02_backlog.md                ← Product Backlog + Historias de Usuario
├── 03_sprints.md               ← Ejecución de Sprint 1
├── 04_arquitectura.md           ← Diseño arquitectónico + Mermaid
├── 05_modelo_datos.md           ← Esquemas de datos + ER
├── 06_api_contratos.md          ← Contratos de API REST
├── 07_cronograma.md             ← Cronograma de desarrollo
└── diagramas/                   ← Diagramas en formato Mermaid
    ├── uml/
    │   ├── arquitectura-alto-nivel.mmd
    │   └── despliegue.mmd
    ├── flujo/
    │   ├── flujo-prediccion.mmd
    │   └── flujo-simulacion.mmd
    └── secuencia/
        ├── secuencia-prediccion.mmd
        └── secuencia-simulacion.mmd
```

---

## Propósito de Cada Archivo

| Archivo | Propósito | Dirigido a |
|---------|-----------|-----------|
| `00_MASTER_PROMPT.md` | Instrucciones para agente IA, estructura del capítulo, referencias | Agente IA |
| `01_requisitos.md` | Especificación completa IEEE 830: actores, RF, RNF, reglas de negocio | Escritura formal |
| `02_backlog.md` | Product Backlog, Historias de Usuario (16), Sprint Backlog | Escritura formal |
| `03_sprints.md` | Ejecución Sprint 1, métricas, limitaciones | Escritura formal |
| `04_arquitectura.md` | Arquitectura microservicios, stack tecnológico, diagramas Mermaid | Escritura + Diagramas |
| `05_modelo_datos.md` | Esquemas PostgreSQL, tablas, relaciones, Pydantic | Escritura + Diagramas |
| `06_api_contratos.md` | Endpoints REST, request/response, validación | Referencia técnica |
| `07_cronograma.md` | Timeline Gantt de desarrollo | Planeación |
| `diagramas/*.mmd` | Diagramas Mermaid para renderizado automático | Inclusión en LaTeX/Markdown |

---

## Convenciones de Uso

### Para Agentes IA (redacción del capítulo)

1. Leer `00_MASTER_PROMPT.md` primero
2. Consultar `01_requisitos.md` para cada requisito funcional
3. Usar diagramas de `diagramas/` insertando el código Mermaid
4. Mantener consistencia con referencias cruzadas (e.g., "ver sección 4.2")

### Para Renderizado Mermaid

En LaTeX (usando `mermaid` package):
```latex
\usepackage{mermaid}
\begin{mermaid}
% código del .mmd
\end{mermaid}
```

En Markdown (Mermaid Preview):
````markdown
```mermaid
% código del .mmd
```
````

---

## Referencias Cruzadas

| Contenido en el Capítulo | Archivo de Soporte |
|-------------------------|-------------------|
| Sección 2.2 Actores | `01_requisitos.md` sección 2 |
| Sección 2.2 Requisitos Funcionales | `01_requisitos.md` sección 3 |
| Sección 2.2 Requisitos No Funcionales | `01_requisitos.md` sección 4 |
| Sección 2.3 Product Backlog | `02_backlog.md` |
| Sección 2.3 Sprint 1 | `03_sprints.md` |
| Sección 2.4 Arquitectura | `04_arquitectura.md` |
| Sección 2.4 Figura X (diagrama) | `diagramas/uml/*.mmd` |
| Sección 2.5 Modelo de Datos | `05_modelo_datos.md` |
| Sección 2.6 Contratos de API | `06_api_contratos.md` |

---

## Metadatos de Versión

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-05-09 | 1.0 | Creación inicial de toda la documentación |


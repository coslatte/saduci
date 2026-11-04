# Índice de Documentación — Capítulo 3: Implementación y Cierre (SADUCI)

## Archivos del Capítulo

```
writings/capitulo-3/
├── 00_MASTER_PROMPT.md              ← Punto de entrada para agentes IA (consolidado)
├── 01_implementacion.md              ← Implementación final: nuevos servicios, módulo de usuarios
├── 02_modelo_datos_actualizado.md    ← Modelo de datos actualizado (5 servicios, nuevas tablas)
├── 03_api_contratos_actualizado.md   ← Contratos de API finales
├── 04_modulo_usuarios.md             ← Módulo de usuarios: roles, permisos, autenticación
├── 05_restructuracion_backend.md     ← Reestructuración del backend (monolito → microservicios)
├── 06_diagramas/                     ← Diagramas Mermaid actualizados
│   ├── arquitectura-alto-nivel.mmd
│   ├── despliegue.mmd
│   ├── secuencia-autenticacion.mmd
│   ├── secuencia-prediccion.mmd
│   ├── secuencia-simulacion.mmd
│   └── flujo-roles-permisos.mmd
└── INDICE.md                         ← Este archivo
```

## Propósito de Cada Archivo

| Archivo | Propósito | Dirigido a |
|---------|-----------|-----------|
| `00_MASTER_PROMPT.md` | Prompt consolidado para LLM: toda la info del Capítulo 3 en un solo documento | Agente IA |
| `01_implementacion.md` | Detalles de implementación final: 5 microservicios, stack actualizado, decisiones | Escritura formal |
| `02_modelo_datos_actualizado.md` | Esquemas de datos finales con todas las tablas y relaciones | Escritura + Diagramas |
| `03_api_contratos_actualizado.md` | Endpoints REST completos con autenticación y autorización por roles | Referencia técnica |
| `04_modulo_usuarios.md` | Sistema de roles (ADMIN, ESPECIALISTA, MEDICO), permisos, seed data | Escritura formal |
| `05_restructuracion_backend.md` | Evolución del backend: de 3 a 5 servicios, nuevas responsabilidades | Escritura formal |
| `diagramas/*.mmd` | Diagramas Mermaid actualizados para renderizado | Inclusión en LaTeX/Markdown |

## Mapeo a Secciones del Capítulo 3

| Sección del Capítulo 3 | Archivo de Soporte |
|------------------------|-------------------|
| 3.1 Introducción / Contexto | `01_implementacion.md` §1 |
| 3.2 Reestructuración del Backend | `05_restructuracion_backend.md` |
| 3.3 Módulo de Usuarios y Roles | `04_modulo_usuarios.md` |
| 3.4 Modelo de Datos Final | `02_modelo_datos_actualizado.md` |
| 3.5 Contratos de API Finales | `03_api_contratos_actualizado.md` |
| 3.6 Implementación Frontend | `01_implementacion.md` §5 |
| 3.7 Pruebas y Validación | `01_implementacion.md` §6 |

## Referencias Cruzadas con Capítulo 2

| Contenido en Capítulo 2 | Actualización en Capítulo 3 |
|------------------------|----------------------------|
| §2.5 Arquitectura (3 servicios) | §3.2 Arquitectura final (5 servicios) |
| §2.6 Modelo de datos (2 BD) | §3.4 Modelo de datos actualizado (5 BD) |
| §2.7 Contratos API (parcial) | §3.5 Contratos API completos |
| §2.3.2 Actores (2 roles) | §3.3 Roles y permisos detallados |

## Metadatos de Versión

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-06-21 | 1.0 | Creación de documentación para Capítulo 3 |

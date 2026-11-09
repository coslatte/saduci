---
name: key-use-case-documentation
description: Mantén sincronizados arquitectura, documentación y diagramas D2 cuando cambie un caso de uso clave de SADUCI, como autenticación, permisos, pacientes, predicción, simulación, estadísticas o historiales.
---

# Documentación de casos de uso clave

Usa este flujo al modificar código que cambia lo que una persona clínica o administradora puede hacer, el recorrido de sus datos o la responsabilidad entre servicios.

## Casos de uso que cubre

- Inicio de sesión, sesión y autorización por roles.
- Gestión y consulta de pacientes.
- Predicción clínica y explicación del resultado.
- Simulación ICU y ejecución de pruebas estadísticas.
- Historiales, consulta y mantenimiento de esos registros.

## Mantén las fuentes coordinadas

1. Verifica el recorrido en el código y los contratos actuales. `docs/sistema/ARCHITECTURE.md` es la arquitectura técnica; el código es autoridad para contratos y comportamiento actual.
2. Actualiza la sección de `docs/sistema/ARCHITECTURE.md` que cambió. Actualiza `docs/sistema/API_ENDPOINTS.md` si cambia la superficie HTTP, y registra el cambio relevante en `docs/sistema/CHANGELOG.md`.
3. Actualiza la fuente D2 correspondiente en `docs/sistema/diagramas/*.d2`. La arquitectura general debe reflejar todo cambio entre capas o servicios; los diagramas de módulo deben reflejar cambios de flujo dentro de ese caso de uso.
4. Regenera las imágenes mediante `scripts/render_diagrams.sh`. No edites a mano GIF o SVG generados.
5. Revisa el README español e inglés cuando cambie arquitectura general o un flujo mostrado allí; ambos deben enlazar a las imágenes generadas y seguir reflejando la topología actual.

## Diagramas

- Usa D2 como formato declarativo editable. La composición `steps` anima la arquitectura general; genera GIF para que la animación se reproduzca en lectores Markdown como GitHub, y SVG para visualizadores que admiten SVG animado.
- Si el CLI D2 no está instalado, sigue la [guía oficial de instalación](https://d2lang.com/tour/install/) antes de regenerar las imágenes.
- Mantén diagramas de módulo separados y enfocados en un flujo por imagen. Usa nombres y etiquetas en español, mantén puertos y límites de confianza explícitos, y no presentes como real una integración opcional.
- Las imágenes `.gif` y `.svg` versionadas son artefactos generados desde sus `.d2` correspondientes.

## Verificación

- Ejecuta `scripts/render_diagrams.sh` y confirma que D2 valida y renderiza todas las fuentes.
- Ejecuta los chequeos de documentación y código que correspondan al cambio, siguiendo `docs/ai/workflow.md` y los comandos indicados en `AGENTS.md`.
- Comprueba los enlaces relativos de ambos README y revisa el diff para no dejar rutas o módulos obsoletos.

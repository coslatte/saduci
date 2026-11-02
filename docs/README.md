# Documentación

Esta carpeta reúne la documentación del proyecto SADUCI-T.

## Arquitectura

- [Arquitectura de SADUCI-T](ARCHITECTURE.md): componentes, comunicación, persistencia y despliegue.
- [Arquitectura del backend](backend/ARCHITECTURE.md): endpoints, servicios y bases de datos.

## Guías

- [Frontend](frontend/README.md): configura y ejecuta la aplicación web.
- [Backend](backend/README.md): configura y ejecuta los servicios FastAPI.

## Historial de cambios

- [Frontend](frontend/CHANGELOG.md)
- [Backend](backend/CHANGELOG.md)

El registro del modelo permanece junto al artefacto en [`src/backend/src/prediction/models/v1/REGISTRY.md`](../src/backend/src/prediction/models/v1/REGISTRY.md). Las instrucciones para agentes permanecen junto a cada componente.

Las instrucciones de frontend están en [`src/frontend/.agents/AGENT.md`](../src/frontend/.agents/AGENT.md) y [`src/frontend/.github/copilot-instructions.md`](../src/frontend/.github/copilot-instructions.md). Las del backend están en [`src/backend/.github/copilot-instructions.md`](../src/backend/.github/copilot-instructions.md) y `src/backend/.agents/skills/`.

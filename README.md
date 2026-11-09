# SADUCI

Sistema de Ayuda a la Decisión en la Unidad de Cuidados Intensivos. Proyecto
desarrollado en el contexto del Hospital Universitario Arnaldo Milián Castro.

[Read the documentation in English](docs/README.md).

## SADUCI (resumen)

SADUCI es una aplicación web que ayuda al personal clínico a consultar
información de pacientes, revisar predicciones y explorar simulaciones de
cuidados intensivos. La plataforma reúne un frontend Next.js y cuatro servicios
de backend independientes.

## Arquitectura

El siguiente diagrama muestra el recorrido principal. [Abre el diagrama
interactivo de Archify](docs/sistema/diagramas/arquitectura-saduci.html) para
explorar sus componentes y fuentes. Consulta también la
[documentación técnica de arquitectura](docs/sistema/ARCHITECTURE.md).

```mermaid
flowchart TB
    clinician([Personal clínico])

    subgraph stack["SADUCI · Docker Compose"]
        platform["SADUCI Platform<br/>Next.js · interfaz y BFF"]
        gateway["API Gateway<br/>JWT · proxy · :7000"]
        user["User Service · :7001"]
        patient["Patient Service · :7002"]
        prediction["Prediction Service · :7003"]
        simulation["Simulation Service · :7004"]
        userdb[(user-db)]
        patientdb[(patient-db)]
        predictiondb[(prediction-db)]
        simulationdb[(simulation-db)]

        platform -->|"API_URL · :7000"| gateway
        gateway --> user
        gateway --> patient
        gateway --> prediction
        gateway --> simulation
        user --> userdb
        patient --> patientdb
        prediction --> predictiondb
        simulation --> simulationdb
    end

    clinician --> platform
```

## Servicio

El backend usa FastAPI y PostgreSQL. El frontend usa Next.js, React y Bun. Cada
servicio de datos mantiene su propia base de datos.

| Servicio | Puerto | Función |
| --- | ---: | --- |
| API Gateway | 7000 | Autenticación, control de acceso y enrutado |
| User Service | 7001 | Usuarios y roles |
| Patient Service | 7002 | Registro de pacientes |
| Prediction Service | 7003 | Predicciones y explicaciones |
| Simulation Service | 7004 | Simulaciones y pruebas estadísticas |

Para iniciar el backend con Docker, copia el archivo de entorno y levanta los
servicios desde `apps/core`:

```bash
cd apps/core
cp .env.example .env
docker compose up --build
```

Inicia el frontend en otra terminal:

```bash
cd apps/platform
bun install
bun run dev
```

La interfaz queda disponible en `http://localhost:4000` y el API Gateway en
`http://localhost:7000`. Para desarrollo sin Docker, consulta la
[guía de ejecución local](docs/sistema/RUNNING.md). La
[guía de despliegue](docs/sistema/DEPLOY.md) contiene los pasos para un servidor.

## Uso Médico

SADUCI ayuda al personal clínico a valorar información y tomar decisiones. No
sustituye el criterio profesional ni los protocolos clínicos de la institución.

La documentación del proyecto indica que la implementación predictiva actual
no está validada para uso clínico prospectivo. Sus resultados no deben
interpretarse como diagnósticos ni como garantía de desenlaces. Consulta el
[estudio de integración del modelo](docs/sistema/INTEGRATION_PLAN_2026.md) y el
[estudio del modelo local de explicaciones](docs/sistema/ESTUDIO_MODELO_LOCAL.md)
para conocer el alcance y las limitaciones documentadas.

## Investigación

La documentación académica está organizada por capítulos:

- [Índice del capítulo 2](docs/tesis/capitulo-2/INDICE.md)
- [Índice del capítulo 3](docs/tesis/capitulo-3/INDICE.md)
- [Diagramas de tesis](docs/tesis/capitulo-2/diagramas/README.md)
- [Estudios y documentos técnicos](docs/sistema/)

La investigación y la evaluación de modelos deben conservar sus datos,
versiones y limitaciones documentadas. No incorpores datos clínicos al
repositorio sin autorización y revisión de privacidad.

## Licencia

El proyecto comunica una clasificación de uso **"tipo 3"** y la intención de
requerir autorización previa para usar SADUCI fuera de la institución de origen.
En la práctica, contacta al titular de los derechos por sus canales
institucionales y solicita autorización escrita antes de usarlo en otra
institución.

"Tipo 3" no identifica por sí solo una licencia de software universal. Este
repositorio no contiene un archivo `LICENSE`, no identifica al titular legal de
los derechos ni publica un contacto para solicitar permisos. Por eso, este
apartado registra la intención comunicada para el proyecto, pero no reemplaza un
texto formal que detalle los permisos y las restricciones. GitHub explica qué
implica publicar un repositorio sin licencia en su
[guía sobre licencias](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

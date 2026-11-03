# Backend

Esta guía cubre el API Gateway y los servicios FastAPI de SADUCI-T. Consulta la [arquitectura general](../ARCHITECTURE.md) para ver cómo se comunican los componentes.

## Requisitos

- Docker y Docker Compose para ejecutar el stack completo.
- Python 3.13 y `uv` para desarrollo local.

## Configurar el entorno

Desde la raíz del repositorio, copia el archivo de ejemplo y configura las credenciales:

```sh
cp src/backend/.env.example .env
```

Define valores propios para `SECRET_KEY`, `AUTH_USERNAME`, `AUTH_PASSWORD` y las contraseñas de las bases de datos. El gateway crea el usuario administrador inicial cuando inicia por primera vez su base de datos.

## Ejecutar los servicios

Desde la raíz del repositorio, inicia todos los servicios y las bases de datos:

```sh
./b-run.sh
```

El script acepta tres opciones: `./b-run.sh --up` inicia los servicios conectados a la terminal, `./b-run.sh --detached` los inicia en segundo plano y `./b-run.sh --down` los detiene. Sin opciones, inicia en segundo plano; si el backend ya está activo, muestra el estado y permite salir o seguir los logs.

El API Gateway escucha en `http://localhost:8000`. Los servicios de pacientes, predicción y simulación escuchan en los puertos `8001`, `8002` y `8003` del host local.

## Ejecutar un servicio en desarrollo

Usa los archivos de dependencias de cada servicio. Por ejemplo, para el gateway:

```sh
cd src/backend
uv pip install -r src/api-gateway/requirements.txt
uv run src/api-gateway/main.py
```

El modo local requiere las variables de entorno del gateway y una base de datos accesible. Para ver endpoints y límites de cada servicio, consulta la [arquitectura](../ARCHITECTURE.md).

## Despliegue

El archivo [`render.yaml`](../../render.yaml) define el API Gateway, Prediction Service y Simulation Service. La configuración local de Compose incluye además el Patient Service y sus bases de datos.

## Historial

Consulta el [changelog del backend](CHANGELOG.md).

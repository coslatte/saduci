# SADUCI

SADUCI reúne la aplicación web y los servicios de backend en un solo proyecto.

- `src/frontend/`: aplicación web Next.js.
- `src/backend/`: API Gateway y microservicios FastAPI, con su configuración Docker Compose.

## Requisitos

- Bun para el frontend.
- Docker Compose para el backend.

## Configuración

Copia `src/backend/.env.example` a `.env` en esta raíz y configura las credenciales requeridas (`SECRET_KEY`, `AUTH_USERNAME`, `AUTH_PASSWORD` y contraseñas de bases de datos). La configuración de Compose se lee desde la raíz al invocar el archivo ubicado en `src/backend/`.

En `src/frontend/.env.local`, configura la URL del gateway: `API_URL=http://localhost:8000`.

## Ejecución

Desde la raíz del proyecto, inicia los servicios backend:

```sh
./b-run.sh
```

Usa `./b-run.sh --up` para conectarte a la salida de los servicios, `./b-run.sh --detached` para iniciarlos en segundo plano o `./b-run.sh --down` para detenerlos. Sin opciones, el script inicia el backend en segundo plano; si ya está activo, muestra su estado y permite salir o seguir los logs.

En otra terminal, inicia el frontend:

```sh
cd src/frontend
bun install
bun dev
```

Abre <http://localhost:3030>. El API Gateway queda en <http://localhost:8000>.

Consulta el [índice de documentación](docs/README.md) para la arquitectura, las guías de frontend y backend, y los changelogs.

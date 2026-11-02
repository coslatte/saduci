# SADUCI-T

SADUCI-T reúne la aplicación web y los servicios de backend en un solo proyecto.

- `frontend/`: aplicación web Next.js.
- `backend/`: API Gateway y microservicios FastAPI, con su configuración Docker Compose.

## Requisitos

- Bun para el frontend.
- Docker Compose para el backend.

## Configuración

Copia `backend/.env.example` a `.env` en esta raíz y configura las credenciales requeridas (`SECRET_KEY`, `AUTH_USERNAME`, `AUTH_PASSWORD` y contraseñas de bases de datos). La configuración de Compose se lee desde la raíz al invocar el archivo ubicado en `backend/`.

En `frontend/.env.local`, configura la URL del gateway: `API_URL=http://localhost:8000`.

## Ejecución

Desde la raíz del proyecto, inicia los servicios backend:

```sh
docker compose -f backend/docker-compose.yml up -d --build
```

En otra terminal, inicia el frontend:

```sh
cd frontend
bun install
bun dev
```

Abre <http://localhost:3000>. El API Gateway queda en <http://localhost:8000>.

Para detener el backend:

```sh
docker compose -f backend/docker-compose.yml down
```

Consulta `frontend/README.md` y `backend/README.md` para las instrucciones específicas de cada parte.

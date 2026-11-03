# Frontend

El frontend es una aplicación Next.js con App Router. Sus Route Handlers envían las solicitudes del servidor al API Gateway configurado en `API_URL`.

## Requisitos

- Bun.
- El API Gateway en ejecución para autenticación, predicciones, simulaciones y estadística.

## Configurar el entorno

Desde la raíz del repositorio, crea el archivo local de configuración:

```sh
cp src/frontend/.env.example src/frontend/.env.local
```

Configura `API_URL=http://localhost:8000` en `src/frontend/.env.local`. Esta variable se lee en el servidor Next.js.

## Ejecutar la aplicación

```sh
cd src/frontend
bun install
bun dev
```

Abre <http://localhost:3030>.

## Enlaces

- [Arquitectura general](../ARCHITECTURE.md)
- [Changelog del frontend](CHANGELOG.md)

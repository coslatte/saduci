# AGENT.md — Instrucciones para agentes de IA (saduci-platform)

Directrices específicas del frontend. El panorama del monorepo está en
`/README.md` y la arquitectura canónica en
`docs/sistema/ARCHITECTURE.md`.

## Stack técnico

- **Framework**: Next.js 16 (App Router) + React 19.
- **Lenguaje**: TypeScript estricto.
- **Estilos**: Tailwind CSS v4 (utilidades inline + `cn()`).
- **Paquetes**: Bun (`bun`, `bunx`); Node ejecuta el build de producción.
- **Iconos**: `react-icons`, importando solo los usados.
- **Backend**: saduci-core (FastAPI microservicios) a través del API Gateway :7000.

## Flujo en ejecución

```
Client Component → cliente de dominio / lib/http.ts → Route Handler /api/* → API_URL → API Gateway :7000 → microservicio
```

- El navegador habla con el BFF del mismo origen. No debe llamar a los servicios internos de los puertos 7001–7004.
- `src/lib/apiProxy.ts` resuelve `API_URL`, con `http://localhost:7000` como valor local predeterminado.
- `src/proxy.ts` protege y redirige páginas; no debe interceptar `/api/*`.
- `AuthProvider` y su store gestionan la sesión. La cookie `httpOnly` la necesita el BFF y el proxy; algunos clientes también envían el token reflejado en `localStorage`.
- Las pantallas actuales usan clientes de `src/lib/` y estado local. `server-api.ts`, `useFormWithAction` y React Query existen, pero no son el flujo de las pantallas revisadas. No añadas un segundo patrón de datos sin migrar un flujo completo.

## Capas disponibles

- `src/app/`: páginas y Route Handlers BFF.
- `src/components/`: componentes compartidos `atoms/`, `molecules/`, `organisms/` y `layout/`.
- `src/entities/` y `src/features/`: modelos y módulos de dominio; verifica consumidores antes de asumir que una ruta de código está activa.
- `src/lib/`: clientes HTTP, adaptadores de datos, autenticación y utilidades.
- `src/test/`: tests del frontend.

**Regla de integración:** componentes cliente → `/api/*` → API Gateway. No llames al backend desde un componente cliente ni dupliques la resolución de `API_URL`.

## Convenciones del proyecto

- Componentes en `src/components/` por atomicidad: `atoms/`, `molecules/`, `organisms/`, `layout/`. Composición `atom -> molecule -> organism -> page`.
- Páginas en `src/app/**` (App Router). `"use client"` solo con estado, efectos o APIs de navegador.
- `page.tsx` se reserva para entry points de ruta; los componentes reutilizables usan PascalCase descriptivo.
- Utilidades compartidas: `cn()` en `src/lib/utils.ts`, tipos en `src/lib/types.ts`; imports con el alias `@/`.
- Literales visibles centralizados en `src/constants/` (por dominio).
- Los Route Handlers `/api/*` son un BFF server-side hacia el API Gateway (`API_URL`); el navegador nunca llama a los servicios internos (puertos 7001–7004).
- Rutas de URL y claves de navegación en inglés; textos visibles en español.
- **Nuevas capas**: `src/entities/`, `src/features/`, `src/providers/`, `src/hooks/`, `src/shared/`.

## Estilos (Tailwind v4)

- Preferir utilidades inline y `cn()` para clases condicionales; evitar constantes de estilo de un solo uso.
- Evitar `!important`, hacks de CSS y widths/heights fijos; preferir `w-full`, `max-w-*`, `h-auto` para responsividad.
- Seguir el patrón de mapas de clases para variantes y tamaños.
- Grid para distribuciones de dos dimensiones (filas que se alinean entre sí,
  grupos de tarjetas que se reacomodan); flex para una sola dimensión. No
  simular una rejilla con flex.
- Colores de saturación baja y media; la saturação alta se reserva para el
  elemento que debe llamar la atención. Ningún estado se comunica solo con color.

## Skills de esta aplicación

En `apps/platform/.agents/skills/`:

- `react-without-usememo` — `useMemo` está prohibido; sustituto por caso.
- `responsive-and-color` — revisión de responsividad, grid/flex y color.
- `backend-contracts` — sincronía con los contratos del backend.

## Testing

- Todo componente nuevo o modificado incluye/actualiza tests en `src/test/components/**`, alineados por dominio (`atoms`, `molecules`, `organisms`, `layout`).
- Tests deterministas de comportamiento/DOM/clases; evitar snapshots frágiles.
- Los mocks respetan los schemas del backend: si cambia el contrato, el test debe fallar hasta actualizarlo.
- Comandos: `bun run lint`, `bunx tsc --noEmit`, `bun test --preload ./src/test/setup.ts`.

## Regla de ejecución de builds

- No ejecutar `bun run build` por defecto durante implementación o refactor.
- Ejecutar `build` solo cuando el usuario lo solicite explícitamente.

## Descubrimiento de código

- Antes de cualquier búsqueda, consultar el grafo de `codebase-memory-mcp`
  (`search_graph`, `trace_path`, `get_code_snippet`, `query_graph`,
  `check_index_coverage`). Es más barato en tokens que leer archivos.
- Usar `grep`/`glob`/lectura directa para literales, configs y verificación, y
  cuando el MCP no esté disponible.
- Detalle en `.agents/skills/codebase-memory-first/SKILL.md` (raíz del monorepo).

## Microservicios: invariantes obligatorias

1. **Un solo upstream**: browser → `/api/*` BFF → API Gateway :7000. Prohibido acceder a `localhost:7001–7004` o `127.0.0.1:7001–7004` desde platform.
2. **Feature = contrato del gateway**: `features/*/api.ts` usa paths relativos al gateway (`/api/predictions`, `/auth/*`, etc.).
3. **Normalización por feature**: shapes de respuesta distintos por servicio → normalizar en `features/*/api.ts` a tipos internos.
4. **Timeouts por feature**: `lib/server/timeouts.ts` configurables.
5. **Auth unificado**: la cookie httpOnly `SESSION_COOKIE` (`lib/session.ts`) es la fuente de verdad en el servidor. `localStorage` solo la refleja para que el navegador añada su cabecera `Authorization`.
6. **El proxy no matchea `/api`**: las rutas BFF responden JSON, incluido 401. Si `config.matcher` las captura, devuelve HTML con un 307 donde el cliente espera un payload, la hidratación de sesión falla y la entrada al sistema se queda en blanco.
7. **`proxy.ts` es la convención de Next.js 16.** El archivo se llama `proxy.ts` y exporta una función llamada `proxy` (o `default`). `middleware.ts` está deprecado y `src/proxy.ts` debe renombrarse, no duplicarse.

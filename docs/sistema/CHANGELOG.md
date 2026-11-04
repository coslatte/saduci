# Changelog — SADUCI monorepo

Todos los cambios relevantes del sistema unificado. El historial previo de cada
aplicación se conserva en `docs/sistema/history/core-changelog.md` y
`docs/sistema/history/platform-changelog.md`.

## [Unreleased]

### Fixed — Sesión del frontend: la entrada al sistema se quedaba en blanco

- Nadie escribía la cookie `auth-token`, pero tres capas la leían: `middleware.ts`,
  `lib/server-api.ts` y las rutas BFF. El login solo guardaba el JWT en
  `localStorage`, así que el servidor era permanentemente anónimo y la entrada
  oscilaba entre `/home` y `/login` con pantalla en blanco.
- `config.matcher` capturaba `/api/*`, de modo que un `/api/auth/me` sin sesión
  recibía un 307 con HTML donde el cliente esperaba JSON. La hidratación de
  sesión fallaba siempre. Las rutas BFF quedan fuera del matcher y autentican
  ellas mismas, con 401 en JSON.
- La cookie httpOnly pasa a ser la fuente de verdad en el servidor
  (`lib/session.ts`); `localStorage` solo la refleja para que el navegador añada
  su cabecera `Authorization`. `ShellController` muestra un estado explicativo en
  vez de renderizar `null`.
- `?redirect=` se honra en el login, aceptando solo paths internos del mismo
  origen: un `?redirect=https://evil.example` ya no expulsa al usuario del sitio.

### Changed — Estructura del monorepo y orquestación

- `infra/` desaparece. El compose y su configuración a `apps/core/compose.yaml`
  y `apps/core/.env.example`; la documentación a `docs/sistema/` y `docs/tesis/`;
  los logs de ejecución a `logs/`.
- `apps/core/compose.yaml` levanta el backend y sus cuatro bases; el frontend
  queda en el perfil `platform`, para el despliegue completo en servidor. En
  desarrollo corre aparte con `bun run dev`, con sus logs y su recarga en
  caliente en primera persona.
- `Dockerfile` del frontend adapted al contexto de build `apps/platform`, con su
  `.dockerignore` propio. Antes habría fallado al cambiar el contexto en el
  compose.
- `scripts/saduci.py` queda en primer plano por defecto: el arranque se muestra
  paso a paso y luego la terminal converge los logs de todos los servicios con
  el nombre de cada uno. Suma `--detach`, `logs --follow` y arranque por
  aplicación (`up backend`, `up platform`).
- Se retiraron los lanzadores redundantes: `dev.ps1`, `dev.sh` y los tres `.bat`
  de arranque. Queda un solo orquestador, `scripts/saduci.py`.
- `apps/core/tools/compose_init.py` eliminado: era un segundo orquestador de
  Docker que duplicaba lo que ya cubrían `saduci.py` y el `Makefile`, sin estar
  registrado como entry point.
- Se eliminó la copia paralela de despliegue (`docs/DEPLOYMENT.md`): era una
  tercera versión de la misma guía, con puertos y rutas desactualizados. Quedan
  dos documentos con responsabilidades distintas: `RUNNING.md` (ejecución
  local) y `DEPLOY.md` (servidor).
- Puertos de la documentación corregidos a 7000-7004, que es lo que declaran
  `apps/core/compose.yaml` y el orquestador.

### Changed — Frontend sin `useMemo`

- `useMemo` eliminado por completo del frontend (8 llamadas en 7 archivos).
  Cada caso se resolvió con la alternativa que le correspondía: cálculo directo
  en render para valores baratos (`expandedKeys` en `Sidebar`, permisos de
  simulaciones, duración estimada en `useSimulationRunner`) y funciones de
  módulo puras y testeables para las tablas (`DataTable.buildColumnDefs` y los
  `build*Rows` de `records/{predictions,simulations,statistics}/page.tsx`).
  Una Promise no sustituye a `useMemo`: modela un resultado asíncrono, no un
  cálculo síncrono conservado.
- `context/notifications.tsx`: el valor de contexto se partió en dos contextos
  (estado y acciones). Las acciones ya eran estables con `useCallback`, así que
  ahora un cambio de notificación no las invalida. Se exportan
  `useNotificationsState` y `useNotificationsActions`.
- `README.md`: el diagrama de arquitectura pasa de ASCII a Mermaid.

### Added — Skills del proyecto

- Skills de raíz en `.agents/skills/`: `codebase-memory-first` (consultar el
  grafo antes de usar grep, con caída a las herramientas propias si el MCP no
  está disponible, reindexación si no encuentra lo buscado, y
  `check_index_coverage` antes de afirmaciones negativas),
  `monorepo-layout` (a qué categoría pertenece cada archivo nuevo, y por qué
  `infra/` y `apps/core/tools/` ya no existen) y `project-language`
  (código en inglés, logs y textos visibles en español, el contrato manda).
- Skills del frontend en `apps/platform/.agents/skills/`:
  `react-without-usememo`, `responsive-and-color` (grid sobre flex para
  distribuciones de dos dimensiones, tamaños fluidos, contraste y color sin
  depender del tono) y `backend-contracts` (sincronía con el gateway, la
  normalización en `features/*/api.ts`, la cookie `SESSION_COOKIE` como único
  origen de sesión y la exclusión de `/api` del matcher del middleware).

### Known — Suite de tests del frontend con contaminación entre archivos

- 5 tests de `AccessibleSelect` fallan en la suite completa y pasan 5/5 en
  aislamiento. La causa está identificada: ejecutar `middleware()` bajo happy-dom
  llama a `NextResponse.redirect`, y ese estado global rompe las consultas de
  Testing Library de los archivos que corren después (`getBy*` encuentra
  duplicados). No es un defecto de los componentes.
- El arreglo limpio es ejecutar los tests del middleware en su propio proceso,
  no un parche en `setup.ts`. Pendiente de decisión.

### Changed — Registros, formularios y navegación

- Vistas `Detalles de Simulación` (`/records/simulations/[id]`) y `Detalles
  de Predicción` (`/records/predictions/[id]`): sin entrada en el sidebar,
  con subnivel en el breadcrumb del header. Los historiales de
  `Realizar Simulación` y `Realizar Predicción` enlazan a ellas.
- BFF: `GET /api/simulations/[id]` y `GET /api/predictions/[id]` nuevos; el
  BFF de cómputo (`/api/simulation`, `/api/prediction`) reenvía el
  `Authorization` para que el gateway persista `user_id`/`created_by`.
- `POST /simulation` acepta `patient_id` opcional
  (`PlatformSimulationRequest`); sin él se conserva `SIM-{edad}-{apache}`.
- `PlatformPredictionRequest.diag_ing2` ahora usa el catálogo `PREUCI_DIAG`
  (0-40, 0 = Vacío) en vez de 39-173; la predicción pide nombres, no
  números. Mocks y tests actualizados al nuevo contrato.
- `Creado por` cae al usuario logueado cuando el backend no trae autor; la
  columna `Resultado` deriva la probabilidad de mortalidad de `results`
  cuando no hay resultado explícito.
- Simulaciones sin edición (solo ver/eliminar); `+ Nuevo` abre un popout
  (`Dialog`: cierra al clicar fuera y con Escape) con el mismo formulario
  clínico y botón de ejecutar de cada flujo; se eliminó el formulario
  manual inline de simulaciones.
- Sidebar: hijos de Simulación reordenados y nuevo grupo `Registros`;
  las secciones desplegadas por el usuario persisten tras navegar
  (`saduci:sidebar-expanded`) con chevron propio.
- `APACHE II`: la ayuda muestra el min/max real de cada flujo y el `Input`
  numérico recorta al rango (steppers + escritura) en vez de solo marcar
  en rojo; los steppers devuelven el foco y emiten `input`/`change`.
- Exportación SVG propia de la tabla de resultados (UTF-8 explícito, sin
  wrap) junto al CSV; `AccessibleSelect` renderiza su lista en un portal
  con flip, tokens `z-index` centralizados en `src/lib/zIndex.ts`.
- Selección de texto del navegador restaurada (se retiró el `::selection`
  personalizado).

### Added — Monorepo

- Repositorio único en la raíz `saduci/` con historial fusionado de
  `sadeci-core` y `saduci-platform` mediante `git subtree`.
- Estructura `apps/core` (FastAPI) + `apps/platform` (Next.js) + `scripts/` +
  `docs/` + `scripts/`.
- `apps/core/compose.yaml` unificado (5 servicios + 4 PostgreSQL) con
  contexto de build en la raíz del repo y perfil `full` para el frontend.
- `apps/core/.env.example` centralizado.
- `apps/platform/Dockerfile` multi-stage (Bun → Next standalone) y
  `output: "standalone"` en `next.config.ts`.
- `Makefile` y `scripts/saduci.py` para operar ambos stacks desde la raíz.
- `AGENTS.md` con las reglas de ambos stacks.

### Added — Despliegue

- `docs/sistema/DEPLOY.md`: guía de despliegue, operación, verificación y
  diagnóstico, con la topología, las variables de entorno y la migración desde
  el layout de dos repos.
- Reintentos y timeouts de `pip` en los cinco `Dockerfile` para tolerar redes
  inestables durante el build.

### Changed — Limpieza

- Eliminados comentarios redundantes y separadores decorativos en el backend
  (`api-gateway`, `prediction`, `simulation`, `user`, tests) y en el frontend
  (`constants`, `Popover`, `NavItem`, `BadgeBlock`, `simulation`, `statistics`
  y páginas de registros). Se conservan los que explican decisiones no obvias.

### Changed — Reglas de agentes y skills

- `AGENTS.md` raíz actualizado al enfoque arquitectónico actual (microservicios
  + Database per Service, frontera de red única, contratos en
   `shared_core/schemas/`, rutas en inglés, sin Alembic) y descubrimiento con
  `codebase-memory-mcp`.
- `apps/core/.github/copilot-instructions.md` reescrito: tabla real de 5
  servicios/puertos, sin Alembic, Python 3.13 + `uv`, ruff
  (`line-length = 100`, `select = ["E", "F", "W"]`) y política de docs vigente.
- `apps/platform/.agents/AGENT.md` reescrito: Next.js 16, React 19, Tailwind v4,
  Bun, atomic design, BFF en `/api/*`, literales en `src/constants/`.
- `apps/platform/.github/copilot-instructions.md`: política MCP-first,
  verificación con `lint` + `tsc` + `test` (sin `build` implícito), sin secciones
  duplicadas y ejemplos de nombres en inglés.
- Skills de `apps/core` alineados al proyecto: `documentation-policy` con los
  4 docs activos, `python-code-style` con py313/ruff real, `python-testing-patterns`
  con `uv` y Python 3.13, `python-project-structure` con el layout de
  microservicios, y referencia rota a `python-design-patterns` corregida.
- Eliminado `apps/platform/.agents/react-doctor/SKILL.md` duplicado.

### Removed — Código muerto

- Frontend: `layout/Container`, `Flex`, `Grid` y su barrel; `molecules/LinkCard`
  y `NotificationsPanel`; `organisms/AppError`; hook `useNotifications`,
  `GlobalProps`, `TypographyTone`, `PREDICTION_DIAG_ING2_OPTIONS` y los mocks
  `MOCK_SIMULATION_RECORDS`/`MOCK_PREDICTION_RECORDS`. Barrel `molecules` y
  `organisms` ajustados.
- Backend: paquetes sin uso `src/shared_core/routers/`, `src/shared_core/constants/`
  y `src/shared_core/__version__.py`; alias `TokenResponse` y método
  `ServiceClient.post_files` sin llamadas.

### Changed — Monorepo

- Los `Dockerfile` del backend ahora copian desde `apps/core/src/...` (contexto
  raíz) para unificar Compose y Render.
- `apps/core/tools/compose_init.py` eliminado: era un segundo orquestador de
  Docker que duplicaba lo que ya cubrían `saduci.py` y el `Makefile`.
- Documentación consolidada en `docs/`: `ARCHITECTURE.md`, `API_ENDPOINTS.md`,
  `CHANGELOG.md` e historial por app.

### Fixed — Backend (heredado de la revisión)

- `SyntaxError` en `src/shared/constants/__init__.py` y `src/shared/__version__.py`.
- `POST /predictions` devuelve 400 para modelos no soportados.
- Alias `POST /prediccion` y `POST /prediccion/explain` en el gateway.
- Headers `X-User-*` reenviados en endpoints de plataforma.
- Roles aplicados en PUT/DELETE de predicciones, simulaciones y estadísticas.
- Status upstream preservado (ya no se enmascara como 502).
- Arranque resiliente en Patient/Simulation; `httpx` declarado en patient.
- Estadísticas ICU serializables (numpy → float).
- Suite de pruebas ampliada a 95 tests.

### Fixed — Frontend (heredado de la revisión)

- Restaurado `src/test/setup.ts`; `bun test` vuelve a ejecutarse.
- `/register` público y auto-login tras el registro.
- Rangos clínicos alineados al backend (`diag_ing2`, `apache`, `percent`).
- CRUD de registros (crear/editar/eliminar) con permisos por rol.
- Panel de usuarios con roles reales y enlace en la navegación.
- Lint y tipos en cero.

### Fixed — Frontend (UX de errores)

- Añadido `app/global-error.tsx`: cuando el layout raíz o una navegación
  fallan con 500, se muestra un fallback con `Reintentar` y `Volver al inicio`
  en lugar de la página por defecto de Next.js o una pantalla en blanco.
- `Toaster` y banner de «sin conexión» ahora se montan en el layout raíz, por lo
  que login, registro y cualquier ruta pública muestran feedback (antes solo
  existían dentro de `AppShell`).
- Errores de red normalizados a un mensaje en español (`lib/apiErrors.ts`) y
  centralizados en `lib/http.ts`; cualquier `401` dispara el cierre de sesión
  global (`lib/session.ts`).
- Sesión expirada: `AuthProvider` distingue `401/403` (sesión inválida) de
  fallos transitorios. En el primer caso limpia la sesión y el login muestra
  «Tu sesión ha expirado»; en el segundo conserva la sesión cacheada para no
  expulsar al usuario por una caída puntual del servidor.
- Panel `/admin/users`: se puede editar `username`, `email`, `role`, activar o
  desactivar con un toggle y guardar cambios (nuevo `PUT /admin/users/{id}`).
- Sidebar: la expansión de los submenús ahora es persistente. El estado vive en
  `Sidebar` (no en cada `TreeItem`), se auto-expande la sección que contiene la
  ruta activa y el hover solo previsualiza. Al hacer clic en un ítem con
  subcategorías se navega a su página y la sección no se contrae; un control
  desplegable (chevron) a la derecha la abre o cierra de forma explícita
  (`lib/navigation.ts` expone `collectActiveNavigationKeys`).
- Los `Popover` se cierran al cambiar de ruta, evitando que paneles superpuestos
  (perfil, notificaciones) queden abiertos sobre la página nueva.

### Changed — Frontend (rutas)

- Rutas de página unificadas a inglés: `/records/simulations`,
  `/records/predictions`, `/records/statistics` y `/prediction/explanations`.
  Las URLs antiguas (`/registros/...`, `/prediction/explicaciones`) redirigen de
  forma permanente desde `next.config.ts`.

### Changed — Backend

- `ACCESS_TOKEN_EXPIRE_MINUTES` pasa de 30 a 1440 minutos (24 h) por defecto,
  alineado con la expectativa de sesión del frontend.

### Removed — Frontend

- Constructor de páginas dinámicas (Page Builder) y su caso de uso: rutas
  `/admin`, `/admin/create`, `/admin/builder/[pageId]` y `/pages/[slug]`, API
  `/api/page-configs`, contexto `pageBuilder`, `blockRegistry`,
  `pageConfigService`, `pageConfigTypes`, `DynamicPage` y los bloques de
  contenido. Se conserva la gestión de usuarios en `/admin/users`.

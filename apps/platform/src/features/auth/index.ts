/**
 * Barril de la feature de autenticacion.
 *
 * Solo exporta lo que un Client Component puede usar de forma segura.
 *
 * Antes este archivo re-exportaba tambien la capa de Server Actions
 * (./api, ./service, ./actions/*). Eso arrastraba `src/lib/server-api.ts`,
 * que hace `import "server-only"`, un paquete que LANZA excepcion al
 * importarse desde un Client Component. Como layout.tsx monta
 * `<AuthProvider>` desde este barril, el bundle del cliente reventaba y
 * todas las paginas quedaban en blanco.
 *
 * La capa de Server Actions sigue en el arbol (api.ts, service.ts,
 * actions/*) pero debe importarse por su ruta concreta
 * ("@/features/auth/api"), nunca desde aqui.
 */
export { AuthProvider, useAuth } from "./AuthProvider";
export { useAuthStore, type AuthState } from "./store/auth.store";

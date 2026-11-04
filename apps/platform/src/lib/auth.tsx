/**
 * Re-export de compatibilidad de la autenticacion.
 *
 * ANTES este archivo contenia una segunda implementacion completa de
 * AuthProvider/useAuth. Eso rompia la app: `src/app/layout.tsx` monta el
 * provider de `@/features/auth`, pero ~16 componentes hacian `useAuth()`
 * desde aqui, es decir contra OTRO contexto de React distinto. Resultado:
 * "useAuth must be used within an AuthProvider" en cada pagina.
 *
 * La implementacion canonica vive en `@/features/auth`. Este archivo se
 * conserva para no tocar los ~16 imports existentes; cuando migren todos a
 * `@/features/auth`, este archivo puede eliminarse.
 */
export { AuthProvider, useAuth } from "@/features/auth";
export type { AuthState } from "@/features/auth";

/** `User` historico; equivale al usuario del store canonico. */
export type User = NonNullable<import("@/features/auth").AuthState["user"]>;

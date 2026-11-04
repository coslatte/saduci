/**
 * Name of the httpOnly cookie that carries the gateway JWT.
 *
 * This cookie is the server-side source of truth for "is there a session?":
 * `proxy.ts` guards the pages with it and every BFF route falls back to it
 * when the caller sends no `Authorization` header. `localStorage` only mirrors
 * the token so the browser can attach a `Bearer` header on its own requests.
 */
export const SESSION_COOKIE = "auth-token";

type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  listeners.forEach((listener) => listener());
}

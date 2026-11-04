/**
 * Post-login destination.
 *
 * `proxy.ts` sends unauthenticated visitors to `/login?redirect=<path>`,
 * so honouring that parameter is what makes the redirect meaningful instead of
 * always dropping the user on the home page.
 *
 * Only same-origin absolute paths are accepted. `//host` and absolute URLs are
 * rejected so a crafted query string cannot bounce the browser off-site, and
 * `/login` / `/register` are rejected because sending an authenticated user
 * back to a public route would loop.
 */
const PUBLIC_PREFIXES = ["/login", "/register"];

export const DEFAULT_POST_LOGIN_PATH = "/home";

export function resolvePostLoginTarget(search: string): string {
  const requested = new URLSearchParams(search).get("redirect");

  if (!requested) return DEFAULT_POST_LOGIN_PATH;
  if (!requested.startsWith("/")) return DEFAULT_POST_LOGIN_PATH;
  if (requested.startsWith("//")) return DEFAULT_POST_LOGIN_PATH;
  if (
    PUBLIC_PREFIXES.some(
      (prefix) => requested === prefix || requested.startsWith(`${prefix}?`),
    )
  ) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return requested;
}

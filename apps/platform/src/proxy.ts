import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Only same-origin absolute paths are accepted as post-login targets, so a
 * crafted `?redirect=https://evil.example` cannot bounce the user off-site.
 */
function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (
    PUBLIC_PATHS.some((path) => value === path || value.startsWith(`${path}?`))
  ) {
    return null;
  }
  return value;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);

  if (pathname !== "/") {
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

/**
 * Page-level access control.
 *
 * Next.js 16 renamed this file convention: `middleware.ts` is now `proxy.ts`,
 * and the exported function must be named `proxy` (or be the default export).
 *
 * The session is read from the httpOnly cookie because that is the only
 * credential available while rendering on the server. Requests under `/api`
 * are deliberately NOT matched here: they are BFF endpoints that must answer
 * with JSON (including 401) and perform their own auth, so redirecting them to
 * the login screen would hand the browser HTML where it expects a payload and
 * stall the client-side session hydration.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublicPath) {
    // Reachable with or without a session. Only an authenticated visitor is
    // moved on, and never back into a public route, which would loop.
    if (!token) return NextResponse.next();
    const requested = safeInternalPath(
      request.nextUrl.searchParams.get("redirect"),
    );
    return NextResponse.redirect(new URL(requested ?? "/home", request.url));
  }

  // The root is not a page: resolve it here so no blank frame is rendered
  // while the client store hydrates and decides where to go.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token ? "/home" : "/login", request.url),
    );
  }

  if (!token) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match every page except:
     * - /api/*            (BFF endpoints: own auth, must return JSON)
     * - _next/static      (static files)
     * - _next/image       (image optimization)
     * - favicon.ico, robots.txt
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};

import "server-only";

import type { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Server-only helpers that write the session cookie on a Route Handler
 * response. Route Handlers receive cookies through `request.cookies` (read
 * only), so the value has to be attached to the response being returned.
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export function setSessionCookie(
  response: NextResponse,
  token: string,
): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    ...baseCookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", {
    ...baseCookieOptions,
    maxAge: 0,
  });
  return response;
}

/**
 * Reads the gateway JWT out of a login payload. The gateway answers
 * `{ access_token, user }`; anything else means the contract drifted and the
 * session must not be created.
 */
export function readAccessToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).access_token;
  return typeof value === "string" && value.trim() ? value : null;
}

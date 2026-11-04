import { NextRequest, NextResponse } from "next/server";
import { AUTH_UPSTREAM_TIMEOUT_MS, resolveCoreApiUrl } from "@/lib/apiProxy";
import {
  clearSessionCookie,
  readAccessToken,
  setSessionCookie,
} from "@/lib/sessionCookie";

const CORE_API_URL = resolveCoreApiUrl();

/**
 * Login BFF route. On success it stores the gateway JWT in the httpOnly session
 * cookie, which is what `proxy.ts` and the other BFF routes read. Without
 * this the server has no way to tell an authenticated request from an anonymous
 * one, and every protected route bounced back to /login forever.
 */
export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la solicitud inválido." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    AUTH_UPSTREAM_TIMEOUT_MS,
  );

  try {
    const upstream = await fetch(`${CORE_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    const response = NextResponse.json(data, { status: upstream.status });

    if (!upstream.ok) {
      // A rejected login must not leave a stale cookie behind.
      return clearSessionCookie(response);
    }

    const token = readAccessToken(data);
    if (!token) {
      return clearSessionCookie(
        NextResponse.json(
          { error: "La respuesta de autenticación no es válida." },
          { status: 502 },
        ),
      );
    }

    return setSessionCookie(response, token);
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return clearSessionCookie(
      NextResponse.json(
        {
          error: isAborted
            ? "La autenticación tardó demasiado en responder."
            : "No se pudo conectar con el servicio de autenticación.",
        },
        { status: isAborted ? 504 : 502 },
      ),
    );
  } finally {
    clearTimeout(timeout);
  }
}

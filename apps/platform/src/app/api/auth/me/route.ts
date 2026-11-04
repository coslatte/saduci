import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_UPSTREAM_TIMEOUT_MS,
  getTokenFromRequest,
  resolveCoreApiUrl,
} from "@/lib/apiProxy";
import { clearSessionCookie } from "@/lib/sessionCookie";

const CORE_API_URL = resolveCoreApiUrl();

/**
 * Session probe used by the client to restore its auth state on boot.
 *
 * Accepts the token from the `Authorization` header or the session cookie, so a
 * session restored from the cookie alone resolves instead of failing. A 401 or
 * 403 from the gateway also expires the cookie, otherwise a dead session would
 * keep the proxy letting the user into protected pages forever.
 */
export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);

  if (!token) {
    return NextResponse.json(
      { detail: "Credenciales de autenticación no enviadas." },
      { status: 401 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    AUTH_UPSTREAM_TIMEOUT_MS,
  );
  const onClientAbort = () => controller.abort();
  req.signal.addEventListener("abort", onClientAbort);

  try {
    const upstream = await fetch(`${CORE_API_URL}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    const response = NextResponse.json(data, { status: upstream.status });

    if (upstream.status === 401 || upstream.status === 403) {
      return clearSessionCookie(response);
    }

    return response;
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "La validación de la sesión tardó demasiado en responder."
          : "No se pudo conectar con el servicio de autenticación.",
      },
      { status: isAborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener("abort", onClientAbort);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { AUTH_UPSTREAM_TIMEOUT_MS } from "@/lib/apiProxy";

const CORE_API_URL = resolveCoreApiUrl();
import { resolveCoreApiUrl } from "@/lib/apiProxy";

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
  const onClientAbort = () => controller.abort();
  req.signal.addEventListener("abort", onClientAbort);

  try {
    const upstream = await fetch(`${CORE_API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(body as Record<string, unknown>),
        username: (body as Record<string, unknown>)?.username ?? "",
      }),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { detail: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio de registro tardó demasiado en responder."
          : "No se pudo conectar con el servicio de registro.",
      },
      { status: isAborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener("abort", onClientAbort);
  }
}

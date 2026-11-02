import { NextRequest, NextResponse } from "next/server";

function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

const CORE_API_URL = resolveCoreApiUrl();

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
  const timeout = setTimeout(() => controller.abort(), 30_000);

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

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "La autenticación tardó demasiado en responder."
          : "No se pudo conectar con el servicio de autenticación.",
      },
      { status: isAborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

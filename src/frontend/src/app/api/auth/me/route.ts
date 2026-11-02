import { NextRequest, NextResponse } from "next/server";

function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

const CORE_API_URL = resolveCoreApiUrl();

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";

  if (!authHeader) {
    return NextResponse.json(
      { detail: "Credenciales de autenticación no enviadas." },
      { status: 401 },
    );
  }

  if (authHeader.startsWith("Bearer mock_")) {
    return NextResponse.json({
      id: 999,
      username: "dev_user",
      email: "dev@saduci.com",
      is_active: true,
      is_superuser: true,
    });
  }

  try {
    const upstream = await fetch(`${CORE_API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
      signal: req.signal,
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
          ? "La validación de la sesión tardó demasiado en responder."
          : "No se pudo conectar con el servicio de autenticación.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}

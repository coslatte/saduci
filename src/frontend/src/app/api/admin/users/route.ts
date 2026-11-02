import { NextRequest, NextResponse } from "next/server";

function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

const CORE_API_URL = resolveCoreApiUrl();

async function getTokenFromHeader(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  const cookieStore = req.cookies;
  return cookieStore.get("auth-token")?.value ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const upstream = await fetch(`${CORE_API_URL}/admin/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json(
      { error: "ID de usuario requerido" },
      { status: 400 },
    );
  }

  try {
    const token = await getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const upstream = await fetch(`${CORE_API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
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
          ? "El servicio tardó demasiado en responder."
          : "No se pudo conectar con el servicio.",
      },
      { status: isAborted ? 504 : 502 },
    );
  }
}

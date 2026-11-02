import { NextResponse } from "next/server";

function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

const CORE_API_URL = resolveCoreApiUrl();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authorization = req.headers.get("authorization") ?? "";

    if (!authorization) {
      return NextResponse.json(
        { ok: false, message: "Credenciales de autenticación no enviadas." },
        { status: 401 },
      );
    }

    const upstream = await fetch(`${CORE_API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { message: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Error en el servidor." },
      { status: 500 },
    );
  }
}

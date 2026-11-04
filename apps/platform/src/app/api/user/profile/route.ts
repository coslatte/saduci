import { NextRequest, NextResponse } from "next/server";
import { resolveCoreApiUrl } from "@/lib/apiProxy";

const CORE_API_URL = resolveCoreApiUrl();

export async function PUT(req: NextRequest) {
  try {
    const authorization = req.headers.get("authorization") ?? "";

    if (!authorization) {
      return NextResponse.json(
        { ok: false, message: "Credenciales de autenticación no enviadas." },
        { status: 401 },
      );
    }

    const body = await req.json();

    const upstream = await fetch(`${CORE_API_URL}/api/user/profile`, {
      method: "PUT",
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

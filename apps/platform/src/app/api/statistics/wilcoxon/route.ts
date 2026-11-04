import { NextRequest, NextResponse } from "next/server";
import { resolveCoreApiUrl } from "@/lib/apiProxy";

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
    const payload = Array.isArray(body)
      ? body
      : {
          x:
            (body as Record<string, unknown>).sample_a ??
            (body as Record<string, unknown>).x,
          y:
            (body as Record<string, unknown>).sample_b ??
            (body as Record<string, unknown>).y,
          variable:
            (body as Record<string, unknown>).variable ??
            (body as Record<string, unknown>).label ??
            undefined,
        };

    const upstream = await fetch(`${CORE_API_URL}/statistics/wilcoxon`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("authorization")
          ? { authorization: req.headers.get("authorization") as string }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data: unknown = await upstream.json();

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "El servidor de estadísticas tardó demasiado en responder."
          : "No se pudo conectar con el servidor de estadísticas.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

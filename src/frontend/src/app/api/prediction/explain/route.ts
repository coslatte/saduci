import { NextRequest, NextResponse } from "next/server";

function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

const CORE_API_URL = resolveCoreApiUrl();
const EXPLAIN_ENDPOINT = `${CORE_API_URL}/prediccion/explain`;

export async function POST(req: NextRequest) {
  return handlePredictionExplainRequest(req);
}

export async function handlePredictionExplainRequest(
  req: Request | NextRequest,
  fetcher: typeof fetch = fetch,
) {
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
    const upstream = await fetcher(EXPLAIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { error: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "El servidor de explicabilidad tardó demasiado en responder."
          : "No se pudo conectar con el servidor de explicabilidad.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

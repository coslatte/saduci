import { NextRequest, NextResponse } from "next/server";

function resolveCoreApiUrl(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}

const CORE_API_URL = resolveCoreApiUrl();
const PREDICTION_ENDPOINTS = [
  `${CORE_API_URL}/prediction`,
  `${CORE_API_URL}/api/predictions`,
  "http://localhost:8002/predictions",
];

function getUpstreamErrorMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim().length > 0) return data;
  if (!data || typeof data !== "object") return null;

  if (
    "error" in data &&
    typeof data.error === "string" &&
    data.error.trim().length > 0
  ) {
    return data.error;
  }

  if (
    "detail" in data &&
    typeof data.detail === "string" &&
    data.detail.trim().length > 0
  ) {
    return data.detail;
  }

  if (
    "message" in data &&
    typeof data.message === "string" &&
    data.message.trim().length > 0
  ) {
    return data.message;
  }

  return null;
}

export async function POST(req: NextRequest) {
  return handlePredictionRequest(req);
}

export async function handlePredictionRequest(
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
    let lastStatus = 502;
    let lastUrl = PREDICTION_ENDPOINTS[0];
    let lastData: unknown = null;

    for (const endpoint of PREDICTION_ENDPOINTS) {
      lastUrl = endpoint;
      const upstream = await fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const contentType = upstream.headers.get("content-type") ?? "";
      const data: unknown = contentType.includes("application/json")
        ? await upstream.json()
        : { error: await upstream.text() };

      lastStatus = upstream.status;
      lastData = data;

      if (upstream.status !== 404) {
        return NextResponse.json(data, { status: upstream.status });
      }
    }

    return NextResponse.json(
      {
        error:
          "El backend activo no expone un endpoint compatible de predicción. Verifica la versión desplegada de saduci-core o el servicio legacy.",
        upstream_status: lastStatus,
        upstream_url: lastUrl,
        upstream_error: getUpstreamErrorMessage(lastData),
      },
      { status: 502 },
    );
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "El servidor de predicción tardó demasiado en responder."
          : "No se pudo conectar con el servidor de predicción.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

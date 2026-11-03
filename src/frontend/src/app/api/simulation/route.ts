import { NextRequest, NextResponse } from "next/server";

const CORE_API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

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
  const abort = () => controller.abort();
  req.signal.addEventListener("abort", abort, { once: true });
  if (req.signal.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 360_000);

  try {
    const upstream = await fetch(`${CORE_API_URL}/simulation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.any([req.signal, controller.signal]),
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const data: unknown = contentType.includes("application/json")
      ? await upstream.json()
      : { error: await upstream.text() };

    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const isAborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isAborted
          ? "El servicio de simulación tardó demasiado en responder."
          : "No se pudo conectar con el servidor de simulación.",
      },
      { status: isAborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
    req.signal.removeEventListener("abort", abort);
  }
}

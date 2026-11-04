import { NextRequest, NextResponse } from "next/server";
import { proxyCoreJsonRequest, readJsonBody } from "@/lib/apiProxy";

export async function GET(req: NextRequest) {
  return proxyCoreJsonRequest(req, "/api/simulations", { method: "GET" });
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);

  if (body === null) {
    return NextResponse.json(
      { error: "Cuerpo de la solicitud inválido." },
      { status: 400 },
    );
  }

  return proxyCoreJsonRequest(req, "/api/simulations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

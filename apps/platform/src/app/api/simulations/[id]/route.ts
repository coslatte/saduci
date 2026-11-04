import { NextRequest } from "next/server";
import {
  proxyCoreJsonRequest,
  proxyCoreRecordById,
  readJsonBody,
} from "@/lib/apiProxy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyCoreRecordById(req, "/api/simulations", id, [
    "id",
    "simulation_id",
    "uuid",
  ]);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readJsonBody(req);

  if (body === null) {
    return proxyCoreJsonRequest(req, `/api/simulations/${id}`, {
      method: "PUT",
      body: "{}",
    });
  }

  return proxyCoreJsonRequest(req, `/api/simulations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyCoreJsonRequest(req, `/api/simulations/${id}`, {
    method: "DELETE",
  });
}

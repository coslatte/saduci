import { NextRequest } from "next/server";
import { proxyCoreJsonRequest, readJsonBody } from "@/lib/apiProxy";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await readJsonBody(req);

  if (body === null) {
    return proxyCoreJsonRequest(req, `/api/statistical-tests/${id}`, {
      method: "PUT",
      body: "{}",
    });
  }

  return proxyCoreJsonRequest(req, `/api/statistical-tests/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyCoreJsonRequest(req, `/api/statistical-tests/${id}`, {
    method: "DELETE",
  });
}

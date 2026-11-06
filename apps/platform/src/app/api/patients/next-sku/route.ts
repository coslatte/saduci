import { NextRequest } from "next/server";
import { proxyCoreJsonRequest } from "@/lib/apiProxy";

export async function POST(req: NextRequest) {
  return proxyCoreJsonRequest(req, "/api/patients/next-sku", {
    method: "POST",
  });
}

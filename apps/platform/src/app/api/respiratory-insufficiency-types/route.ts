import { NextRequest } from "next/server";
import { proxyCoreJsonRequest } from "@/lib/apiProxy";

export async function GET(req: NextRequest) {
  return proxyCoreJsonRequest(req, "/api/respiratory-insufficiency-types", {
    method: "GET",
  });
}

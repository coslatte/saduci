import { describe, expect, it } from "bun:test";
import { handlePredictionRequest } from "@/app/api/prediction/route";

function request() {
  return new Request("http://localhost/api/prediction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edad: 30 }),
  });
}

describe("prediction service boundary", () => {
  it("returns a module error when the service is unreachable", async () => {
    const fetcher: typeof fetch = Object.assign(
      async () => {
        throw new TypeError("connection refused");
      },
      { preconnect: fetch.preconnect },
    );
    const response = await handlePredictionRequest(request(), fetcher);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "No se pudo conectar con el servidor de predicción.",
    });
  });

  it("forwards the request directly to the API Gateway", async () => {
    let calls = 0;
    let requestedUrl = "";
    const fetcher: typeof fetch = Object.assign(
      async (input: RequestInfo | URL) => {
        calls++;
        requestedUrl = String(input);
        return Response.json({ probability: 0.25 });
      },
      { preconnect: fetch.preconnect },
    );
    const response = await handlePredictionRequest(request(), fetcher);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ probability: 0.25 });
    expect(calls).toBe(1);
    expect(requestedUrl).toBe("http://localhost:8000/prediccion");
  });
});

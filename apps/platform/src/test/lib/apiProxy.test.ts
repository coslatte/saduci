import "../setup";
import { afterEach, describe, expect, it } from "bun:test";
import { resolveCoreApiUrl } from "@/lib/apiProxy";

const originalApiUrl = process.env.API_URL;
const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  if (originalApiUrl === undefined) delete process.env.API_URL;
  else process.env.API_URL = originalApiUrl;

  if (originalPublicApiUrl === undefined)
    delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
});

describe("resolveCoreApiUrl", () => {
  it("uses the local API Gateway port when no URL is configured", () => {
    delete process.env.API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(resolveCoreApiUrl()).toBe("http://localhost:7000");
  });

  it("removes a trailing API path and slash from configured URLs", () => {
    process.env.API_URL = "http://gateway.internal:7000/api/";

    expect(resolveCoreApiUrl()).toBe("http://gateway.internal:7000");
  });
});

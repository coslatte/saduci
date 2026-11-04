import "./setup";
import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";

function request(path: string, cookie?: string): NextRequest {
  const url = `http://localhost:4000${path}`;
  const headers = new Headers();
  if (cookie) headers.set("cookie", `auth-token=${cookie}`);
  return new NextRequest(url, { headers });
}

function locationOf(response: Response): string | null {
  return response.headers.get("location");
}

describe("proxy page guards", () => {
  it("never matches API routes so BFF answers stay JSON", () => {
    // Regression: the matcher used to include /api/*, so an unauthenticated
    // /api/auth/me was answered with a 307 to the login page. The client got
    // HTML instead of a payload, session hydration always failed, and the
    // entry flow stalled with no visible feedback.
    expect(config.matcher).toHaveLength(1);
    expect(config.matcher[0]).toContain("api");
  });

  it("sends the root path to the login screen when there is no session", () => {
    const response = proxy(request("/"));
    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe("http://localhost:4000/login");
  });

  it("sends the root path to home when the session cookie is present", () => {
    const response = proxy(request("/", "token-1"));
    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe("http://localhost:4000/home");
  });

  it("preserves the requested path in the login redirect", () => {
    const response = proxy(request("/records/predictions"));
    expect(locationOf(response)).toBe(
      "http://localhost:4000/login?redirect=%2Frecords%2Fpredictions",
    );
  });

  it("lets public routes through", () => {
    expect(proxy(request("/login")).status).toBe(200);
    expect(proxy(request("/register")).status).toBe(200);
  });

  it("lets an authenticated visitor out of the login screen", () => {
    const response = proxy(request("/login", "token-1"));
    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe("http://localhost:4000/home");
  });

  it("honours a safe internal redirect target", () => {
    const response = proxy(request("/login?redirect=%2Fsettings", "token-1"));
    expect(locationOf(response)).toBe("http://localhost:4000/settings");
  });

  it("refuses an off-site or self-referencing redirect target", () => {
    const offSite = proxy(
      request("/login?redirect=https%3A%2F%2Fevil.example", "token-1"),
    );
    expect(locationOf(offSite)).toBe("http://localhost:4000/home");

    const loop = proxy(request("/login?redirect=%2Flogin", "token-1"));
    expect(locationOf(loop)).toBe("http://localhost:4000/home");
  });

  it("admits an authenticated user to a protected page", () => {
    expect(proxy(request("/home", "token-1")).status).toBe(200);
  });
});

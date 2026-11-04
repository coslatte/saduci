import "../setup";
import { fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { AuthProvider, useAuth } from "@/lib/auth";

const originalFetch = globalThis.fetch;

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function LoginProbe() {
  const { login, user } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void login("admin", "secret");
      }}
    >
      {user ? `ok:${user.username}` : "go"}
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("AuthProvider login", () => {
  it("retries while the backend is down and completes when it is back", async () => {
    let loginCalls = 0;
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input);
      if (url === "/api/health") {
        return jsonResponse({ reachable: true }, 200);
      }
      // Session probe on mount: no token yet, so the anonymous answer.
      if (url === "/api/auth/me") {
        return jsonResponse({ detail: "no session" }, 401);
      }
      if (url === "/api/auth/login") {
        loginCalls += 1;
        if (loginCalls === 1) {
          return jsonResponse({ error: "No se pudo conectar." }, 502);
        }
        return jsonResponse(
          {
            access_token: "token-1",
            user: {
              id: 1,
              username: "admin",
              email: "admin@saduci.com",
              role: "ADMIN",
            },
          },
          200,
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const { container } = render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );
    const scope = within(container);
    fireEvent.click(scope.getByText("go"));

    await scope.findByText("ok:admin", undefined, { timeout: 5_000 });
    expect(loginCalls).toBe(2);
    expect(localStorage.getItem("saduci_token")).toBe("token-1");
  });

  it("surfaces invalid credentials without retrying", async () => {
    let loginCalls = 0;
    const errors: unknown[] = [];
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input);
      if (url === "/api/health") {
        return jsonResponse({ reachable: true }, 200);
      }
      if (url === "/api/auth/me") {
        return jsonResponse({ detail: "no session" }, 401);
      }
      loginCalls += 1;
      return jsonResponse({ error: "Credenciales inválidas." }, 401);
    }) as unknown as typeof fetch;

    function FailingLoginProbe() {
      const { login } = useAuth();
      return (
        <button
          type="button"
          onClick={() => {
            void login("admin", "wrong").catch((err: unknown) =>
              errors.push(err),
            );
          }}
        >
          go
        </button>
      );
    }

    const { container } = render(
      <AuthProvider>
        <FailingLoginProbe />
      </AuthProvider>,
    );
    const scope = within(container);
    fireEvent.click(scope.getByText("go"));

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(loginCalls).toBe(1);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("Credenciales inválidas.");
  });
});

describe("AuthProvider session hydration", () => {
  it("restores the session from the cookie when no token is mirrored locally", async () => {
    // Regression: the session cookie is httpOnly, so a browser that lost its
    // localStorage mirror still holds a valid session. Hydration used to bail
    // out whenever `saduci_token` was missing, which logged the user out and
    // bounced them between /login and /home forever.
    const authHeaders: (string | null)[] = [];
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/health") {
        return jsonResponse({ reachable: true }, 200);
      }
      if (url === "/api/auth/me") {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        authHeaders.push(headers.Authorization ?? null);
        return jsonResponse(
          {
            id: "7",
            username: "admin",
            email: "admin@saduci.com",
            role: "ADMIN",
            isActive: true,
            isSuperuser: true,
          },
          200,
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const { container } = render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );
    const scope = within(container);

    await scope.findByText("ok:admin", undefined, { timeout: 5_000 });
    // No bearer header: the BFF route resolves the token from the cookie.
    expect(authHeaders).toEqual([null]);
    expect(localStorage.getItem("saduci_token")).toBeNull();
  });
});

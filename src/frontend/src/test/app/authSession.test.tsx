import { afterEach, describe, expect, it } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  localStorage.clear();
});

function SessionControls() {
  const { user, logout } = useAuth();
  return (
    <>
      <span>{user?.username ?? "Sin sesión"}</span>
      <button onClick={logout}>Salir</button>
    </>
  );
}

describe("session restoration", () => {
  it("does not restore a session after logout while validation is pending", async () => {
    localStorage.setItem("saduci_token", "token-test");
    let resolveResponse: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    let started = false;
    globalThis.fetch = Object.assign(
      () => {
        started = true;
        return pending;
      },
      { preconnect: originalFetch.preconnect },
    );
    const view = render(
      <AuthProvider>
        <SessionControls />
      </AuthProvider>,
    );
    await waitFor(() => expect(started).toBe(true));
    fireEvent.click(view.getByRole("button", { name: "Salir" }));
    await act(async () => {
      resolveResponse(
        Response.json({
          id: 1,
          username: "usuario",
          email: "user@example.com",
        }),
      );
      await pending;
    });
    expect(view.getByText("Sin sesión")).toBeTruthy();
    expect(localStorage.getItem("saduci_token")).toBeNull();
    view.unmount();
  });
});

import "../../setup";
import {
  fireEvent,
  render,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import type { ReactNode } from "react";

const LOGIN_BUTTON = "Iniciar sesión";
const LOGIN_EMAIL_LABEL = "Usuario o correo electrónico";
const LOGIN_PASSWORD_LABEL = "Contraseña";
const LOGIN_PROMPT = "Inicie sesión para acceder a la plataforma";

const replace = mock(() => {});
const refresh = mock(() => {});
const login = mock(async () => {});

type LoginRetryOptions = {
  signal?: AbortSignal;
  onRetry?: (progress: { attempt: number; nextDelayMs: number }) => void;
};

function mockLoginOnce(
  implementation: (
    identifier: string,
    password: string,
    options?: LoginRetryOptions,
  ) => Promise<void>,
) {
  (
    login as unknown as {
      mockImplementationOnce: (
        fn: (
          identifier: string,
          password: string,
          options?: LoginRetryOptions,
        ) => Promise<void>,
      ) => void;
    }
  ).mockImplementationOnce(implementation);
}

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: replace, replace, refresh }),
}));

mock.module("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    sessionError: null,
    clearSessionError: () => {},
    login,
    register: async () => {},
    logout: () => {},
  }),
}));

import LoginForm from "@/app/login/components/LoginForm";

describe("LoginForm", () => {
  it("renders the credential form and submits credentials", async () => {
    const { container } = render(<LoginForm />);
    const scope = within(container);

    expect(scope.getByText(LOGIN_PROMPT)).toBeTruthy();
    expect(scope.getByLabelText(LOGIN_EMAIL_LABEL)).toBeTruthy();
    expect(scope.getByLabelText(LOGIN_PASSWORD_LABEL)).toBeTruthy();

    const submitButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes(LOGIN_BUTTON),
    );
    expect(submitButton).toBeTruthy();

    fireEvent.input(scope.getByLabelText(LOGIN_EMAIL_LABEL), {
      target: { value: " admin " },
    });
    fireEvent.input(scope.getByLabelText(LOGIN_PASSWORD_LABEL), {
      target: { value: "secret" },
    });
    fireEvent.click(submitButton!);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(login).toHaveBeenCalledWith(
      "admin",
      "secret",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    // `replace`, not `push`: the login screen must not stay in history.
    expect(replace).toHaveBeenCalledWith("/home");
    // Regression: `refresh` used to be chained right after `replace`, which
    // aborted the navigation before it committed. The URL stayed on /login
    // while the session was already valid, so `ShellController` parked the
    // app on its "Cargando…" screen forever. The refresh must stay out.
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the retry status while the server is unreachable", async () => {
    mockLoginOnce(async (identifier, password, options) => {
      expect(identifier).toBe("admin");
      expect(password).toBe("secret");
      options?.onRetry?.({ attempt: 2, nextDelayMs: 3_000 });
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    const { container } = render(<LoginForm />);
    const scope = within(container);

    fireEvent.input(scope.getByLabelText(LOGIN_EMAIL_LABEL), {
      target: { value: "admin" },
    });
    fireEvent.input(scope.getByLabelText(LOGIN_PASSWORD_LABEL), {
      target: { value: "secret" },
    });
    const submitButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes(LOGIN_BUTTON),
    );
    fireEvent.click(submitButton!);

    await scope.findByText(/Reintentando en/);
    expect(scope.getByText(/intento\s*2/)).toBeTruthy();
    await waitForElementToBeRemoved(() => scope.queryByText(/Reintentando en/));
  });
});

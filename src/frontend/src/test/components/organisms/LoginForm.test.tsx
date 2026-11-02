import "../../setup";
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import type { ReactNode } from "react";
import {
  LOGIN_BUTTON,
  LOGIN_EMAIL_LABEL,
  LOGIN_PASSWORD_LABEL,
  LOGIN_HELP_TEXT,
  LOGIN_PROMPT,
} from "@/constants/constants";

const push = mock(() => {});
const login = mock(async () => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

mock.module("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
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
    expect(scope.getByText(LOGIN_HELP_TEXT)).toBeTruthy();
    expect(scope.getByLabelText(LOGIN_EMAIL_LABEL)).toBeTruthy();
    expect(scope.getByLabelText(LOGIN_PASSWORD_LABEL)).toBeTruthy();

    const submitButton = scope.getByRole("button");
    expect(submitButton.textContent?.includes(LOGIN_BUTTON)).toBe(true);

    fireEvent.input(scope.getByLabelText(LOGIN_EMAIL_LABEL), {
      target: { value: " admin " },
    });
    fireEvent.input(scope.getByLabelText(LOGIN_PASSWORD_LABEL), {
      target: { value: "secret" },
    });
    fireEvent.click(submitButton);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(login).toHaveBeenCalledWith("admin", "secret");
    expect(push).toHaveBeenCalledWith("/");
  });
});

import "../../setup";
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import {
  REGISTER_EMAIL_LABEL,
  REGISTER_PASSWORD_LABEL,
  REGISTER_CONFIRM_PASSWORD_LABEL,
  REGISTER_ROLE_LABEL,
  REGISTER_PROMPT,
  REGISTER_ROLE_MEDICO,
} from "@/constants/constants";

const push = mock(() => {});
const register = mock(async () => {});

mock.module("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

mock.module("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: mock(async () => {}),
    register,
    logout: () => {},
  }),
}));

import RegisterForm from "@/app/register/components/RegisterForm";

describe("RegisterForm", () => {
  it("renders the registration form with all fields", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    expect(scope.getByText(REGISTER_PROMPT)).toBeTruthy();
    expect(scope.getByLabelText(REGISTER_EMAIL_LABEL)).toBeTruthy();
    expect(scope.getByLabelText(REGISTER_PASSWORD_LABEL)).toBeTruthy();
    expect(scope.getByLabelText(REGISTER_CONFIRM_PASSWORD_LABEL)).toBeTruthy();
    expect(scope.getByLabelText(REGISTER_ROLE_LABEL)).toBeTruthy();
  });

  it("displays error on invalid email", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const emailInput = scope.getByLabelText(
      REGISTER_EMAIL_LABEL,
    ) as HTMLInputElement;
    const passwordInput = scope.getByLabelText(
      REGISTER_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const confirmPasswordInput = scope.getByLabelText(
      REGISTER_CONFIRM_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const roleSelect = scope.getByLabelText(
      REGISTER_ROLE_LABEL,
    ) as HTMLSelectElement;
    const form = emailInput.closest("form");

    fireEvent.change(emailInput, { target: { value: "notanemail" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.change(roleSelect, { target: { value: REGISTER_ROLE_MEDICO } });
    fireEvent.submit(form!);

    // Register should not have been called due to validation error
    expect(register.mock.calls.length).toBe(0);
  });

  it("displays placeholder text for email input", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const emailInput = scope.getByPlaceholderText(
      /usuario@ejemplo.com/i,
    ) as HTMLInputElement;
    expect(emailInput).toBeTruthy();
  });

  it("requires all form fields", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const emailInput = scope.getByLabelText(
      REGISTER_EMAIL_LABEL,
    ) as HTMLInputElement;
    const passwordInput = scope.getByLabelText(
      REGISTER_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const confirmPasswordInput = scope.getByLabelText(
      REGISTER_CONFIRM_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const roleSelect = scope.getByLabelText(
      REGISTER_ROLE_LABEL,
    ) as HTMLSelectElement;

    expect(emailInput.required).toBe(true);
    expect(passwordInput.required).toBe(true);
    expect(confirmPasswordInput.required).toBe(true);
    expect(roleSelect.required).toBe(true);
  });

  it("displays link to login page", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const loginLink = scope.getByRole("link");
    expect(loginLink).toBeTruthy();
    expect(loginLink.getAttribute("href")).toBe("/login");
  });

  it("renders role select with role options", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const roleSelect = scope.getByLabelText(
      REGISTER_ROLE_LABEL,
    ) as HTMLSelectElement;
    const options = Array.from(roleSelect.options);
    const optionValues = options.map((opt) => opt.value);

    expect(optionValues).toContain(REGISTER_ROLE_MEDICO);
    expect(optionValues).toContain("Administrador");
  });

  it("renders form with inputs that can be filled", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const emailInput = scope.getByLabelText(
      REGISTER_EMAIL_LABEL,
    ) as HTMLInputElement;
    const passwordInput = scope.getByLabelText(
      REGISTER_PASSWORD_LABEL,
    ) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "testpassword" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("testpassword");
  });

  it("renders a submit button with correct label", () => {
    const { container } = render(<RegisterForm />);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    const submitButton = Array.from(buttons).find((btn) =>
      btn.textContent?.includes("Crear usuario"),
    );
    expect(submitButton).toBeTruthy();
  });

  it("prevents submission when passwords don't match", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const emailInput = scope.getByLabelText(
      REGISTER_EMAIL_LABEL,
    ) as HTMLInputElement;
    const passwordInput = scope.getByLabelText(
      REGISTER_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const confirmPasswordInput = scope.getByLabelText(
      REGISTER_CONFIRM_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const roleSelect = scope.getByLabelText(
      REGISTER_ROLE_LABEL,
    ) as HTMLSelectElement;
    const form = emailInput.closest("form");

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "different" } });
    fireEvent.change(roleSelect, { target: { value: REGISTER_ROLE_MEDICO } });
    fireEvent.submit(form!);

    expect(register.mock.calls.length).toBe(0);
  });

  it("prevents submission when password is too short", () => {
    const { container } = render(<RegisterForm />);
    const scope = within(container);

    const emailInput = scope.getByLabelText(
      REGISTER_EMAIL_LABEL,
    ) as HTMLInputElement;
    const passwordInput = scope.getByLabelText(
      REGISTER_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const confirmPasswordInput = scope.getByLabelText(
      REGISTER_CONFIRM_PASSWORD_LABEL,
    ) as HTMLInputElement;
    const roleSelect = scope.getByLabelText(
      REGISTER_ROLE_LABEL,
    ) as HTMLSelectElement;
    const form = emailInput.closest("form");

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "short" } });
    fireEvent.change(roleSelect, { target: { value: REGISTER_ROLE_MEDICO } });
    fireEvent.submit(form!);

    expect(register.mock.calls.length).toBe(0);
  });
});

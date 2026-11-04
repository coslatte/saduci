import "../../setup";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

import { PasswordField } from "@/components/molecules/PasswordField";

describe("PasswordField", () => {
  it("renders a password input with its label", () => {
    const { getByLabelText } = render(
      <PasswordField
        id="pwd"
        label="Contraseña"
        value=""
        onChange={() => {}}
      />,
    );

    const input = getByLabelText("Contraseña") as HTMLInputElement;
    expect(input.type).toBe("password");
  });

  it("toggles visibility", () => {
    const { getByLabelText, getByRole } = render(
      <PasswordField
        id="pwd"
        label="Contraseña"
        value="secret"
        onChange={() => {}}
      />,
    );

    fireEvent.click(getByRole("button", { name: "Mostrar contraseña" }));
    expect((getByLabelText("Contraseña") as HTMLInputElement).type).toBe(
      "text",
    );

    fireEvent.click(getByRole("button", { name: "Ocultar contraseña" }));
    expect((getByLabelText("Contraseña") as HTMLInputElement).type).toBe(
      "password",
    );
  });

  it("reports changes to the parent", () => {
    const onChange = mock(() => {});
    const { getByLabelText } = render(
      <PasswordField
        id="pwd"
        label="Contraseña"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.input(getByLabelText("Contraseña"), {
      target: { value: "Abcdefg1!" },
    });
    expect(onChange).toHaveBeenCalledWith("Abcdefg1!");
  });

  it("shows a strength meter when enabled", () => {
    const { getByText } = render(
      <PasswordField
        id="pwd"
        label="Contraseña"
        value="Abcdefg1!"
        onChange={() => {}}
        showStrength
      />,
    );

    expect(getByText("Muy fuerte")).toBeTruthy();
  });

  it("shows a validation error", () => {
    const { getByText, getByLabelText } = render(
      <PasswordField
        id="pwd"
        label="Contraseña"
        value=""
        onChange={() => {}}
        error="La contraseña es requerida"
      />,
    );

    expect(getByText("La contraseña es requerida")).toBeTruthy();
    expect(
      (getByLabelText("Contraseña") as HTMLInputElement).getAttribute(
        "aria-invalid",
      ),
    ).toBe("true");
  });
});

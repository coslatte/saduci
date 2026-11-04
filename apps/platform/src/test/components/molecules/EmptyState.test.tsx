import "../../setup";
import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

import { EmptyState } from "@/components/molecules/EmptyState";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    const { getByText } = render(
      <EmptyState
        title="No hay usuarios registrados."
        description="Crea el primero."
      />,
    );

    expect(getByText("No hay usuarios registrados.")).toBeTruthy();
    expect(getByText("Crea el primero.")).toBeTruthy();
  });

  it("renders an icon and an action", () => {
    const { getByText, getByRole } = render(
      <EmptyState
        title="Vacío"
        icon={<span data-testid="icon" />}
        action={<button type="button">Crear</button>}
      />,
    );

    expect(getByText("Vacío")).toBeTruthy();
    expect(getByRole("button", { name: "Crear" })).toBeTruthy();
  });
});

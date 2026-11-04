import "../../setup";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

import { ErrorState } from "@/components/molecules/ErrorState";

describe("ErrorState", () => {
  it("renders the title, description and reference", () => {
    const { getByText } = render(
      <ErrorState
        title="No se pudo cargar"
        description="Intenta de nuevo."
        reference="abc123"
      />,
    );

    expect(getByText("No se pudo cargar")).toBeTruthy();
    expect(getByText("Intenta de nuevo.")).toBeTruthy();
    expect(getByText("Referencia: abc123")).toBeTruthy();
  });

  it("calls onRetry when the retry button is clicked", () => {
    const onRetry = mock(() => {});
    const { getByText } = render(
      <ErrorState title="Fallo" onRetry={onRetry} />,
    );

    fireEvent.click(getByText("Reintentar"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("reveals the technical details on demand", () => {
    const { getByText, queryByText } = render(
      <ErrorState title="Fallo" details="TypeError: boom" />,
    );

    expect(queryByText("TypeError: boom")).toBeNull();
    fireEvent.click(getByText("Ver detalles"));
    expect(getByText("TypeError: boom")).toBeTruthy();
  });

  it("announces itself as an alert", () => {
    const { getByRole } = render(<ErrorState title="Fallo" />);
    expect(getByRole("alert")).toBeTruthy();
  });
});

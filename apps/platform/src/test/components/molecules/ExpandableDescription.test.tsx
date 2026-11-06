import "../../setup";
import { describe, expect, it } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { ExpandableDescription } from "@/components/molecules/ExpandableDescription";

describe("descripción desplegable", () => {
  it("permite revelar y ocultar la descripción desde el texto", () => {
    const view = render(
      <ExpandableDescription summary="Resumen">
        Información completa
      </ExpandableDescription>,
    );
    const button = view.getByRole("button", {
      name: /Expandir descripción/,
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(view.getByText(/Información completa/)).toBeTruthy();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});

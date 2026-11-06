import "../../setup";
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";

function bodyScope() {
  return within(document.body as unknown as HTMLElement);
}

describe("ConfirmDialog", () => {
  it("renders title, description and the caution hint", () => {
    render(
      <ConfirmDialog
        open
        title="Eliminar registro"
        description="¿Eliminar el registro?"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    expect(bodyScope().getByText("Eliminar registro")).toBeTruthy();
    expect(bodyScope().getByText("¿Eliminar el registro?")).toBeTruthy();
    expect(
      bodyScope().getByText("Esta acción no se puede deshacer."),
    ).toBeTruthy();
  });

  it("calls onConfirm when confirming", () => {
    const onConfirm = mock(() => {});
    render(
      <ConfirmDialog
        open
        title="Eliminar"
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    fireEvent.click(bodyScope().getByText("Confirmar"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("exige escribir eliminar antes de confirmar", () => {
    const onConfirm = mock(() => {});
    render(
      <ConfirmDialog
        open
        title="Eliminar usuario"
        confirmationText="eliminar"
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );
    const button = bodyScope().getByRole("button", { name: /Confirmar/ });
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(0);
    fireEvent.input(bodyScope().getByRole("textbox"), {
      target: { value: "eliminar" },
    });
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancelling", () => {
    const onClose = mock(() => {});
    render(
      <ConfirmDialog
        open
        title="Eliminar"
        onConfirm={() => {}}
        onClose={onClose}
      />,
    );

    fireEvent.click(bodyScope().getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides the hint when null", () => {
    render(
      <ConfirmDialog
        open
        title="Eliminar"
        hint={null}
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    expect(
      bodyScope().queryByText("Esta acción no se puede deshacer."),
    ).toBeNull();
  });

  it("does not render when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Eliminar"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );

    expect(bodyScope().queryByText("Eliminar")).toBeNull();
  });
});

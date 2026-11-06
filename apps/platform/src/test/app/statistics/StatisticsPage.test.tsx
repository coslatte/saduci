import "../../setup";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";

mock.module("@/app/records/statistics/page", () => ({
  default: () => <div>Historial de pruebas estadísticas</div>,
}));

import StatisticsPage from "@/app/statistics/page";

describe("página de pruebas estadísticas", () => {
  it("muestra el historial primero y ejecuta cada análisis desde su formulario", async () => {
    const view = render(<StatisticsPage />);
    const history = view.getByText("Historial de pruebas estadísticas");
    const executionHeading = view.getByRole("heading", {
      name: "Realizar una prueba estadística",
    });
    const executionSection = within(executionHeading.closest("section")!);

    expect(
      Boolean(
        history.compareDocumentPosition(executionHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
    expect(executionSection.queryByRole("form")).toBeNull();

    fireEvent.click(
      executionSection.getByRole("button", {
        name: /Nueva prueba de Wilcoxon/,
      }),
    );
    const wilcoxonDialog = within(
      view.getByRole("dialog", { name: "Prueba de Wilcoxon" }),
    );
    const wilcoxonForm = wilcoxonDialog.getByRole("form", {
      name: "Formulario de la prueba de Wilcoxon",
    });
    fireEvent.submit(wilcoxonForm);
    expect(
      await wilcoxonDialog.findByText(
        "Debe proporcionar dos muestras con datos para realizar el test de Wilcoxon.",
      ),
    ).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Cerrar diálogo" }));
    fireEvent.click(
      executionSection.getByRole("button", {
        name: /Nueva prueba de Friedman/,
      }),
    );
    expect(
      within(
        view.getByRole("dialog", { name: "Prueba de Friedman" }),
      ).getByRole("form", {
        name: "Formulario de la prueba de Friedman",
      }),
    ).toBeTruthy();
  });
});

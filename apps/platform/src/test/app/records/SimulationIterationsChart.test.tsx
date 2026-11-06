import "../../setup";
import { describe, expect, it } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import {
  SimulationIterationsChart,
  type SimulationIteration,
} from "@/app/records/simulations/[id]/SimulationIterationsChart";

const iterations: SimulationIteration[] = Array.from(
  { length: 26 },
  (_, index) => ({
    iteration: index + 1,
    pre_vam: index + 1,
    vam: index + 2,
    post_vam: index + 3,
    uci: index + 4,
    post_uci: index + 5,
  }),
);

describe("detalle por iteración de simulación", () => {
  it("muestra las variables y permite recorrer las iteraciones paginadas", () => {
    const view = render(<SimulationIterationsChart iterations={iterations} />);
    const rows = within(view.container.querySelector("tbody")!);

    expect(view.getByText("Evolución por iteración")).toBeTruthy();
    expect(view.getAllByText("Tiempo Pre VAM").length).toBeGreaterThan(0);
    expect(rows.getByText("1")).toBeTruthy();
    expect(rows.queryByText("26")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Siguiente" }));

    expect(rows.getByText("26")).toBeTruthy();
    expect(view.getByText("Iteraciones 26–26 de 26")).toBeTruthy();
    expect(view.getByRole("button", { name: "Anterior" })).toBeTruthy();
  });
});

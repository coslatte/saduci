import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { StatisticsFileDropzone } from "@/app/statistics/components/StatisticsFileDropzone";

describe("statistics file selection", () => {
  it("clears the previous selection when an invalid file is chosen", () => {
    const onChange = mock(() => {});
    const previous = new File(["x\n1"], "previous.csv", { type: "text/csv" });
    const view = render(
      <StatisticsFileDropzone
        label="Archivo"
        files={[previous]}
        inputId="csv-test"
        onChange={onChange}
      />,
    );
    const input =
      view.container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("No se encontró el selector de archivos");
    fireEvent.change(input, {
      target: { files: [new File(["x"], "invalid.txt")] },
    });
    expect(onChange).toHaveBeenCalledWith([]);
    expect(view.getByRole("alert").textContent).toContain(".csv");
    view.unmount();
  });
});

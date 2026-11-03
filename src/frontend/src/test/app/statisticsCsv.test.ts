import { describe, expect, it } from "bun:test";
import { extractNumericColumn, parseCSV } from "@/app/statistics/helpers";

describe("paired CSV observations", () => {
  it("preserves numeric rows in their original order", () => {
    const csv = parseCSV("Tiempo VAM\n1\n2\n3");
    expect(extractNumericColumn(csv, "Tiempo VAM")).toEqual([1, 2, 3]);
  });

  it("rejects an empty row instead of shifting later observations", () => {
    const csv = parseCSV("Tiempo VAM\n1\n\n3");
    expect(() => extractNumericColumn(csv, "Tiempo VAM")).toThrow(
      "fila de datos 2",
    );
  });

  it("rejects nonnumeric values instead of silently removing them", () => {
    const csv = parseCSV("Tiempo VAM\n1\nerror\n3");
    expect(() => extractNumericColumn(csv, "Tiempo VAM")).toThrow(
      "fila de datos 2",
    );
  });

  it("rejects duplicate headers, including normalized equivalents", () => {
    expect(() => parseCSV("Tiempo VAM,tiempo vam\n1,2")).toThrow("únicos");
  });

  it("rejects malformed rows and unclosed quotes", () => {
    expect(() => parseCSV("a,b\n1,2,3")).toThrow("cantidad de columnas");
    expect(() => parseCSV('a,b\n"1,2')).toThrow("comillas sin cerrar");
  });

  it("rejects ambiguous numbers instead of changing their magnitude", () => {
    const csv = parseCSV('sep=;\nTiempo VAM\n"1.234,56"');
    expect(() => extractNumericColumn(csv, "Tiempo VAM")).toThrow(
      "no numérico",
    );
  });
});

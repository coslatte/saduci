import "../setup";
import { describe, expect, it } from "bun:test";
import {
  GENERIC_LOADING_PHASES,
  SESSION_LOADING_PHASES,
  resolveLoadingMessage,
} from "@/constants/loading";

describe("resolveLoadingMessage", () => {
  it("starts with the generic message", () => {
    expect(resolveLoadingMessage(0)).toBe("Cargando…");
  });

  it("becomes more specific after a second", () => {
    expect(resolveLoadingMessage(1)).toBe("Cargando datos…");
    expect(resolveLoadingMessage(2)).toBe("Cargando datos…");
  });

  it("acknowledges a long wait", () => {
    expect(resolveLoadingMessage(3)).toBe(
      "Aún trabajando, gracias por esperar…",
    );
    expect(resolveLoadingMessage(8)).toBe(
      "El servidor está tardando más de lo esperado…",
    );
    expect(resolveLoadingMessage(120)).toBe(
      "El servidor está tardando más de lo esperado…",
    );
  });

  it("clamps negative and fractional input", () => {
    expect(resolveLoadingMessage(-5)).toBe("Cargando…");
    expect(resolveLoadingMessage(2.9)).toBe("Cargando datos…");
  });

  it("supports a custom phase list", () => {
    expect(resolveLoadingMessage(0, SESSION_LOADING_PHASES)).toBe(
      "Verificando tu sesión…",
    );
    expect(resolveLoadingMessage(1, SESSION_LOADING_PHASES)).toBe(
      "Cargando la aplicación…",
    );
    expect(resolveLoadingMessage(10, SESSION_LOADING_PHASES)).toBe(
      "La conexión está lenta. Puedes esperar o reintentar la conexión.",
    );
  });

  it("exposes ordered phases", () => {
    const thresholds = GENERIC_LOADING_PHASES.map((phase) => phase.atSeconds);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });
});

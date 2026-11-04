import "../../setup";
import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

import { RunProgress } from "@/components/molecules/RunProgress";

describe("RunProgress", () => {
  it("announces the current status message", () => {
    const { getByRole } = render(
      <RunProgress
        message="Procesando las corridas…"
        elapsedSeconds={0}
        estimatedSeconds={30}
        progressPercent={10}
      />,
    );

    const status = getByRole("status");
    expect(status.getAttribute("aria-label")).toBe("Procesando las corridas…");
    expect(status.getAttribute("aria-busy")).toBe("true");
  });

  it("formats elapsed and estimated durations as mm:ss", () => {
    const { getByText } = render(
      <RunProgress
        message="Ejecutando…"
        elapsedSeconds={75}
        estimatedSeconds={120}
        progressPercent={40}
      />,
    );

    expect(getByText("Transcurrido: 1:15")).toBeTruthy();
    expect(getByText("Estimado: 2:00")).toBeTruthy();
    expect(getByText("Avance estimado: 40%")).toBeTruthy();
  });

  it("uses a custom title", () => {
    const { getByText } = render(
      <RunProgress
        title="Progreso de simulación"
        message="Ejecutando…"
        elapsedSeconds={0}
        estimatedSeconds={10}
        progressPercent={0}
      />,
    );

    expect(getByText("Progreso de simulación")).toBeTruthy();
  });
});

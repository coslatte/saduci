import "../setup";
import { describe, expect, it } from "bun:test";
import { renderHook } from "@testing-library/react";
import { SESSION_LOADING_PHASES } from "@/constants/loading";
import { useProgressiveStatus } from "@/hooks/useProgressiveStatus";

describe("useProgressiveStatus", () => {
  it("reports the first message and zero seconds when active", () => {
    const { result } = renderHook(() => useProgressiveStatus(true));

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.message).toBe("Cargando…");
  });

  it("reports zero while inactive", () => {
    const { result } = renderHook(() => useProgressiveStatus(false));

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.message).toBe("Cargando…");
  });

  it("honors custom phases", () => {
    const { result } = renderHook(() =>
      useProgressiveStatus(true, { phases: SESSION_LOADING_PHASES }),
    );

    expect(result.current.message).toBe("Verificando tu sesión…");
  });
});

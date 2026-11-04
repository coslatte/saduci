import "../../setup";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import type { useSimulationRunner } from "@/app/simulation/hooks/useSimulationRunner";
import SimulationInputs from "@/app/simulation/components/SimulationInputs";

type Runner = ReturnType<typeof useSimulationRunner>;

function createRunner(loading = false) {
  const handleSimulate = mock(async () => {});
  const handleCancelSimulation = mock(() => {});
  const runner = {
    patientId: "P-001",
    setPatientId: () => {},
    handleNewPatient: () => {},
    age: 50,
    setAge: () => {},
    apache: 22,
    setApache: () => {},
    preutiStay: 1,
    setPreutiStay: () => {},
    vamTime: 2,
    setVamTime: () => {},
    utiStay: 3,
    setUtiStay: () => {},
    simPercent: 50,
    setSimPercent: () => {},
    diagIng1: 2,
    setDiagIng1: () => {},
    diagIng2: 0,
    setDiagIng2: () => {},
    diagIng3: 0,
    setDiagIng3: () => {},
    diagIng4: 0,
    setDiagIng4: () => {},
    diagEgreso2: 2,
    setDiagEgreso2: () => {},
    respInsuf: 2,
    setRespInsuf: () => {},
    ventType: 0,
    setVentType: () => {},
    simRuns: 200,
    setSimRuns: () => {},
    loading,
    resultHistory: [],
    activeResultIndex: -1,
    setActiveResultIndex: () => {},
    handleSimulate,
    handleCancelSimulation,
    showLongRunWarning: false,
    estimatedSeconds: 10,
    elapsedSeconds: 0,
    estimatedProgressPercent: 0,
    cancelOnCooldown: false,
    cancelCooldownSeconds: 0,
  } as unknown as Runner;

  return { runner, handleSimulate, handleCancelSimulation };
}

describe("SimulationInputs", () => {
  it("renders the simulation controller action and starts a run", () => {
    const { runner, handleSimulate } = createRunner();
    const { getByRole } = render(<SimulationInputs runner={runner} />);

    fireEvent.click(getByRole("button", { name: "Realizar simulación" }));

    expect(handleSimulate).toHaveBeenCalledTimes(1);
  });

  it("forwards cancellation while a run is active", () => {
    const { runner, handleCancelSimulation } = createRunner(true);
    const { getByRole } = render(<SimulationInputs runner={runner} />);

    fireEvent.click(getByRole("button", { name: "Cancelar simulación" }));

    expect(handleCancelSimulation).toHaveBeenCalledTimes(1);
  });
});

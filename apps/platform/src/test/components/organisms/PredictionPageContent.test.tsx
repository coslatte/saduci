import "../../setup";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RECORD_HISTORY_COPY } from "@/constants/recordHistory";

let failHistoryRequest = true;
const fetchPredictionRecords = mock(async () => {
  if (failHistoryRequest) throw new Error("API no disponible");
  return [];
});

mock.module("@/lib/auth", () => ({
  useAuth: () => ({
    user: { username: "clinica" },
    token: "session-token",
  }),
}));

mock.module("@/lib/recordsApi", () => ({
  fetchPredictionRecords,
  formatRecordDate: () => "hoy",
}));

mock.module("@/app/prediction/hooks/usePredictionRunner", () => ({
  usePredictionRunner: () => ({
    edad: 50,
    setEdad: () => {},
    diagIng1: 2,
    setDiagIng1: () => {},
    diagIng2: 0,
    setDiagIng2: () => {},
    diagEgr2: 2,
    setDiagEgr2: () => {},
    apache: 22,
    setApache: () => {},
    tiempoVam: 2,
    setTiempoVam: () => {},
    loadingPredict: false,
    prediction: null,
    handlePredict: async () => {},
  }),
}));

import { PredictionPageContent } from "@/app/prediction/components/PredictionPageContent";

beforeEach(() => {
  failHistoryRequest = true;
  fetchPredictionRecords.mockClear();
});

describe("PredictionPageContent", () => {
  it("shows a history error and lets the user retry", async () => {
    const { findByText, getByRole } = render(<PredictionPageContent />);

    expect(await findByText("API no disponible")).toBeTruthy();
    expect(
      getByRole("link", { name: "Ver historial completo" }).getAttribute(
        "href",
      ),
    ).toBe("/records/predictions");
    failHistoryRequest = false;
    fireEvent.click(getByRole("button", { name: RECORD_HISTORY_COPY.retry }));

    expect(
      await findByText(RECORD_HISTORY_COPY.predictions.empty),
    ).toBeTruthy();
    expect(fetchPredictionRecords).toHaveBeenCalledTimes(2);
  });
});

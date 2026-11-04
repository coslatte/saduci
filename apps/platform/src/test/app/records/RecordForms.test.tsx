import "../../setup";
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

import { RecordActionsCell } from "@/app/records/components/RecordActionsCell";
import { StatisticsRecordForm } from "@/app/records/components/StatisticsRecordForm";
import { Dialog } from "@/components/molecules/Dialog";
import type { RecordPermissions } from "@/lib/recordPermissions";
import type { StatisticsRecordInput } from "@/lib/recordsApi";

const READ_ONLY: RecordPermissions = {
  canView: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
};

const FULL: RecordPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
};

describe("RecordActionsCell", () => {
  it("shows a read-only badge when no action is permitted", () => {
    const { container } = render(
      <RecordActionsCell permissions={READ_ONLY} onDelete={() => {}} />,
    );
    expect(container.textContent?.includes("Solo lectura")).toBe(true);
  });

  it("invokes onDelete when the delete action is permitted", () => {
    const onDelete = mock(() => {});
    const { container } = render(
      <RecordActionsCell permissions={FULL} onDelete={onDelete} />,
    );
    const button = container.querySelector('[aria-label="Eliminar registro"]');
    expect(button).toBeTruthy();
    fireEvent.click(button!);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("Dialog", () => {
  it("closes on overlay click", () => {
    const onClose = mock(() => {});
    const { getByTestId } = render(
      <Dialog open onClose={onClose} title="Nueva simulación">
        <p>Contenido</p>
      </Dialog>,
    );
    fireEvent.mouseDown(getByTestId("dialog-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = mock(() => {});
    render(
      <Dialog open onClose={onClose} title="Nueva predicción">
        <p>Contenido</p>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <Dialog open={false} onClose={() => {}} title="Cerrado">
        <p>Contenido</p>
      </Dialog>,
    );
    expect(container.textContent?.includes("Contenido")).toBe(false);
  });
});

describe("StatisticsRecordForm", () => {
  it("submits numeric statistic and p-value", async () => {
    let captured: StatisticsRecordInput | null = null;
    const onSubmit = mock((values: StatisticsRecordInput) => {
      captured = values;
    });
    const { container } = render(
      <StatisticsRecordForm
        mode="create"
        submitting={false}
        error={null}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );
    const scope = within(container);

    fireEvent.input(scope.getByLabelText("Variable"), {
      target: { value: "Estancia UCI" },
    });
    fireEvent.input(scope.getByLabelText("Estadístico"), {
      target: { value: "8.5" },
    });
    fireEvent.input(scope.getByLabelText("P"), {
      target: { value: "0.02" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.submit(scope.getByLabelText("Variable").closest("form")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(captured).not.toBeNull();
    expect(captured!.statistic).toBe(8.5);
    expect(captured!.pValue).toBe(0.02);
    expect(captured!.variable).toBe("Estancia UCI");
  });
});

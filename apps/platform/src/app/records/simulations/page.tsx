"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Buttons";
import { Table } from "@/components/molecules/Table";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { showToast } from "@/components/molecules/Toast";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { normalizeRole } from "@/entities/user";
import {
  getRecordPermissions,
  getRecordRoleHint,
  type RecordPermissions,
} from "@/lib/recordPermissions";
import {
  deleteSimulationRecord,
  fetchSimulationRecords,
  formatRecordDate,
} from "@/lib/recordsApi";
import type {
  SimulationRecord,
  SimulationRecordStatus,
} from "@/lib/recordsMockData";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { RecordsPageHeader } from "../components/RecordsPageHeader";
import { RecordActionsCell } from "../components/RecordActionsCell";
import { SimulationRecordDialog } from "../components/SimulationRecordDialog";

const STATUS_LABELS: Record<SimulationRecordStatus, string> = {
  completada: "Completada",
  cancelada: "Cancelada",
  en_proceso: "En proceso",
};

const STATUS_BADGE: Record<
  SimulationRecordStatus,
  "success" | "warning" | "danger"
> = {
  completada: "success",
  cancelada: "danger",
  en_proceso: "warning",
};

function buildSimulationRows(
  records: SimulationRecord[],
  permissions: RecordPermissions,
  deletingId: string | null,
  handleDelete: (record: SimulationRecord) => void,
  openDetail: (recordId: string) => void,
) {
  return records.map((record) => ({
    patientId: <span className="text-center block">{record.patientId}</span>,
    runs: (
      <span className="text-center block">
        {record.runs.toLocaleString("es-ES")}
      </span>
    ),
    result: <span className="text-center block">{record.result}</span>,
    status: (
      <div className="flex justify-center">
        <Badge status={STATUS_BADGE[record.status]}>
          {STATUS_LABELS[record.status]}
        </Badge>
      </div>
    ),
    createdBy: <span className="text-center block">{record.createdBy}</span>,
    createdAt: (
      <span className="text-center block">
        {formatRecordDate(record.createdAt)}
      </span>
    ),
    actions: (
      <RecordActionsCell
        permissions={permissions}
        onView={() => openDetail(record.id)}
        onDelete={() => handleDelete(record)}
        isDeleting={deletingId === record.id}
      />
    ),
  }));
}

export default function SimulationsRecordsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SimulationRecord | null>(
    null,
  );
  // Simulations run from a popout dialog; they are deletable, never editable.
  const [dialogOpen, setDialogOpen] = useState(false);
  const permissions: RecordPermissions = {
    ...getRecordPermissions(normalizeRole(user?.role), "simulations"),
    // Simulations are deletable but never editable.
    canEdit: false,
  };
  const fallbackUser = user?.username ?? "";
  const router = useRouter();

  const loadRecords = useCallback(async () => {
    if (!token) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextRecords = await fetchSimulationRecords(token, fallbackUser);
      setRecords(nextRecords);
    } catch (err) {
      setRecords([]);
      showToast({
        title: "Error al cargar datos",
        description: friendlyErrorMessage(
          err,
          "No se pudieron cargar las simulaciones.",
        ),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [token, fallbackUser]);

  useEffect(() => {
    if (authLoading) return;
    void loadRecords();
  }, [authLoading, loadRecords]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const nextRecords = await fetchSimulationRecords(token, fallbackUser);
        setRecords(nextRecords);
      } catch {
        /* silent */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [token, fallbackUser]);

  async function handleRefresh() {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const nextRecords = await fetchSimulationRecords(token, fallbackUser);
      setRecords(nextRecords);
    } catch (err) {
      showToast({
        title: "Error al actualizar",
        description: friendlyErrorMessage(
          err,
          "No se pudieron cargar los registros.",
        ),
        type: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  const handleDelete = useCallback(
    async (record: SimulationRecord) => {
      if (!token) return;

      setDeletingId(record.id);
      try {
        await deleteSimulationRecord(token, record.id);
        setRecords((current) =>
          current.filter((item) => item.id !== record.id),
        );
        showToast({
          title: "Simulación eliminada",
          description: "El registro se eliminó correctamente.",
          type: "success",
        });
      } catch (err) {
        showToast({
          title: "Error al eliminar",
          description: friendlyErrorMessage(
            err,
            "No se pudo eliminar la simulación.",
          ),
          type: "error",
        });
      } finally {
        setDeletingId(null);
        setPendingDelete(null);
      }
    },
    [token],
  );

  const tableRows = buildSimulationRows(
    records,
    permissions,
    deletingId,
    (record) => setPendingDelete(record),
    (recordId) =>
      router.push(`/records/simulations/${encodeURIComponent(recordId)}`),
  );

  return (
    <main>
      <RecordsPageHeader
        title="Registros de simulaciones"
        description="Consulta las simulaciones clínicas registradas en la plataforma."
        roleHint={getRecordRoleHint(normalizeRole(user?.role))}
      />

      <div className="mb-4 flex items-center justify-end gap-2">
        {permissions.canCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <FiPlus className="mr-1.5" />
            Nuevo
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <FiRefreshCw
            className={`mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {dialogOpen && (
        <SimulationRecordDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={() => void loadRecords()}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar simulación"
        description={
          pendingDelete
            ? `¿Eliminar la simulación de ${pendingDelete.patientId}?`
            : undefined
        }
        confirmLabel="Eliminar"
        loading={deletingId !== null}
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
        onClose={() => setPendingDelete(null)}
      />

      <Table
        ariaLabel="Registros de simulaciones"
        loading={loading || authLoading}
        tableClassName="min-w-[720px]"
        columns={[
          { key: "patientId", label: "Paciente", align: "center" },
          { key: "runs", label: "Corridas", align: "center" },
          { key: "result", label: "Resultado", align: "center" },
          { key: "status", label: "Estado", align: "center" },
          { key: "createdBy", label: "Creado por", align: "center" },
          { key: "createdAt", label: "Fecha", align: "center" },
          { key: "actions", label: "Acciones", align: "center" },
        ]}
        rows={tableRows}
        getRowKey={(_, index) => records[index]?.id ?? index}
        emptyMessage="No hay simulaciones registradas."
      />
    </main>
  );
}

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
  deletePredictionRecord,
  fetchPredictionRecords,
  formatRecordDate,
  updatePredictionRecord,
} from "@/lib/recordsApi";
import type {
  PredictionRecord,
  PredictionRecordStatus,
} from "@/lib/recordsMockData";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { RecordsPageHeader } from "../components/RecordsPageHeader";
import { RecordActionsCell } from "../components/RecordActionsCell";
import { PredictionRecordDialog } from "../components/PredictionRecordDialog";
import {
  PredictionRecordForm,
  type PredictionFormValues,
} from "../components/PredictionRecordForm";

const STATUS_LABELS: Record<PredictionRecordStatus, string> = {
  activa: "Activa",
  archivada: "Archivada",
};

const STATUS_BADGE: Record<PredictionRecordStatus, "success" | "default"> = {
  activa: "success",
  archivada: "default",
};

function buildPredictionRows(
  records: PredictionRecord[],
  permissions: RecordPermissions,
  deletingId: string | null,
  handleDelete: (record: PredictionRecord) => void,
  openDetail: (recordId: string) => void,
  startEdit: (record: PredictionRecord) => void,
) {
  return records.map((record) => ({
    patientId: <span className="text-center block">{record.patientId}</span>,
    outcome: <span className="text-center block">{record.outcome}</span>,
    probability: (
      <span className="text-center block">
        {(record.probability * 100).toFixed(1)}%
      </span>
    ),
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
        onEdit={() => startEdit(record)}
        onDelete={() => handleDelete(record)}
        isDeleting={deletingId === record.id}
      />
    ),
  }));
}

export default function PredictionsRecordsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PredictionRecord | null>(
    null,
  );
  // "+ Nuevo" runs the full prediction form in a popout; inline form is edit-only.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<"edit" | null>(null);
  const [editingRecord, setEditingRecord] = useState<PredictionRecord | null>(
    null,
  );
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const permissions = getRecordPermissions(
    normalizeRole(user?.role),
    "predictions",
  );
  const router = useRouter();
  const fallbackUser = user?.username ?? "";

  const loadRecords = useCallback(async () => {
    if (!token) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextRecords = await fetchPredictionRecords(token, fallbackUser);
      setRecords(nextRecords);
    } catch (err) {
      setRecords([]);
      showToast({
        title: "Error al cargar datos",
        description: friendlyErrorMessage(
          err,
          "No se pudieron cargar las predicciones.",
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
        const nextRecords = await fetchPredictionRecords(token, fallbackUser);
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
      const nextRecords = await fetchPredictionRecords(token, fallbackUser);
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
    async (record: PredictionRecord) => {
      if (!token) return;

      setDeletingId(record.id);
      try {
        await deletePredictionRecord(token, record.id);
        setRecords((current) =>
          current.filter((item) => item.id !== record.id),
        );
        showToast({
          title: "Predicción eliminada",
          description: "El registro se eliminó correctamente.",
          type: "success",
        });
      } catch (err) {
        showToast({
          title: "Error al eliminar",
          description: friendlyErrorMessage(
            err,
            "No se pudo eliminar la predicción.",
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

  const closeForm = useCallback(() => {
    setFormMode(null);
    setEditingRecord(null);
    setFormError(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: PredictionFormValues) => {
      if (!token || !editingRecord) return;
      setFormSubmitting(true);
      setFormError(null);
      try {
        await updatePredictionRecord(token, editingRecord.id, {
          patientId: values.patientId,
          outcome: values.outcome,
          probability: values.probability,
        });
        closeForm();
        await loadRecords();
        showToast({
          title: "Registro guardado",
          description: "La predicción se guardó correctamente.",
          type: "success",
        });
      } catch (err) {
        setFormError(
          friendlyErrorMessage(err, "No se pudo guardar la predicción."),
        );
      } finally {
        setFormSubmitting(false);
      }
    },
    [token, editingRecord, closeForm, loadRecords],
  );

  const tableRows = buildPredictionRows(
    records,
    permissions,
    deletingId,
    (record) => setPendingDelete(record),
    (recordId) =>
      router.push(`/records/predictions/${encodeURIComponent(recordId)}`),
    (record) => {
      setEditingRecord(record);
      setFormMode("edit");
      setFormError(null);
    },
  );

  return (
    <main>
      <RecordsPageHeader
        title="Registros de predicciones"
        description="Consulta las predicciones del modelo clínico."
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
        <PredictionRecordDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={() => void loadRecords()}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar predicción"
        description={
          pendingDelete
            ? `¿Eliminar la predicción de ${pendingDelete.patientId}?`
            : undefined
        }
        confirmLabel="Eliminar"
        loading={deletingId !== null}
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
        }}
        onClose={() => setPendingDelete(null)}
      />

      {formMode && editingRecord && (
        <PredictionRecordForm
          key={editingRecord.id}
          mode={formMode}
          initialValues={{
            patientId: editingRecord.patientId,
            outcome: editingRecord.outcome,
            probability: editingRecord.probability,
          }}
          submitting={formSubmitting}
          error={formError}
          onSubmit={(values) => void handleFormSubmit(values)}
          onCancel={closeForm}
        />
      )}

      <Table
        ariaLabel="Registros de predicciones"
        loading={loading || authLoading}
        tableClassName="min-w-[720px]"
        columns={[
          { key: "patientId", label: "Paciente", align: "center" },
          { key: "outcome", label: "Resultado", align: "center" },
          { key: "probability", label: "Probabilidad", align: "center" },
          { key: "status", label: "Estado", align: "center" },
          { key: "createdBy", label: "Creado por", align: "center" },
          { key: "createdAt", label: "Fecha", align: "center" },
          { key: "actions", label: "Acciones", align: "center" },
        ]}
        rows={tableRows}
        getRowKey={(_, index) => records[index]?.id ?? index}
        emptyMessage="No hay predicciones registradas."
      />
    </main>
  );
}

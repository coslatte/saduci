"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  type RecordPermissions,
} from "@/lib/recordPermissions";
import {
  createStatisticsRecord,
  deleteStatisticsRecord,
  fetchStatisticsRecords,
  formatRecordDate,
  updateStatisticsRecord,
} from "@/lib/recordsApi";
import type {
  StatisticsRecord,
  StatisticalTestType,
} from "@/lib/recordsMockData";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { RECORD_WORKSPACE_COPY } from "@/constants/recordHistory";
import { RecordsPageHeader } from "../components/RecordsPageHeader";
import { RecordActionsCell } from "../components/RecordActionsCell";
import { StatisticsRecordForm } from "../components/StatisticsRecordForm";
import type { StatisticsRecordInput } from "@/lib/recordsApi";

const TEST_LABELS: Record<StatisticalTestType, string> = {
  wilcoxon: "Wilcoxon",
  friedman: "Friedman",
};

function formatPValue(value: number): string {
  if (value === 0) return "0";
  if (value < 0.0001) return "< 0.0001";
  return value.toFixed(4);
}

function buildStatisticsRows(
  records: StatisticsRecord[],
  permissions: RecordPermissions,
  deletingId: string | null,
  handleDelete: (record: StatisticsRecord) => void,
  startEdit: (record: StatisticsRecord) => void,
) {
  return records.map((record) => ({
    testType: (
      <div className="flex justify-center">
        <Badge status="info">{TEST_LABELS[record.testType]}</Badge>
      </div>
    ),
    variable: <span className="text-center block">{record.variable}</span>,
    statistic: (
      <span className="text-center block">{record.statistic.toFixed(4)}</span>
    ),
    pValue: (
      <span className="text-center block">{formatPValue(record.pValue)}</span>
    ),
    interpretation: (
      <span className="text-center block">{record.interpretation}</span>
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
        onEdit={() => startEdit(record)}
        onDelete={() => handleDelete(record)}
        isDeleting={deletingId === record.id}
      />
    ),
  }));
}

export default function StatisticsRecordsPage() {
  const embedded = usePathname() === "/statistics";
  const { user, token, isLoading: authLoading } = useAuth();
  const [records, setRecords] = useState<StatisticsRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StatisticsRecord | null>(
    null,
  );
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingRecord, setEditingRecord] = useState<StatisticsRecord | null>(
    null,
  );
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const permissions = getRecordPermissions(
    normalizeRole(user?.role),
    "statistics",
  );
  const fallbackUser = user?.username ?? "";

  const loadRecords = useCallback(async () => {
    if (!token) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextRecords = await fetchStatisticsRecords(token, fallbackUser);
      setRecords(nextRecords);
    } catch (err) {
      setRecords([]);
      showToast({
        title: "Error al cargar datos",
        description: friendlyErrorMessage(
          err,
          "No se pudieron cargar las pruebas estadísticas.",
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
        const nextRecords = await fetchStatisticsRecords(token, fallbackUser);
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
      const nextRecords = await fetchStatisticsRecords(token, fallbackUser);
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
    async (record: StatisticsRecord) => {
      if (!token) return;

      setDeletingId(record.id);
      try {
        await deleteStatisticsRecord(token, record.id);
        setRecords((current) =>
          current.filter((item) => item.id !== record.id),
        );
        showToast({
          title: "Resultado eliminado",
          description: "El registro se eliminó correctamente.",
          type: "success",
        });
      } catch (err) {
        showToast({
          title: "Error al eliminar",
          description: friendlyErrorMessage(
            err,
            "No se pudo eliminar el resultado.",
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
    async (values: StatisticsRecordInput) => {
      if (!token) return;
      setFormSubmitting(true);
      setFormError(null);
      try {
        if (formMode === "edit" && editingRecord) {
          await updateStatisticsRecord(token, editingRecord.id, values);
        } else {
          await createStatisticsRecord(token, values);
        }
        closeForm();
        await loadRecords();
        showToast({
          title: "Registro guardado",
          description: "El resultado se guardó correctamente.",
          type: "success",
        });
      } catch (err) {
        setFormError(
          friendlyErrorMessage(err, "No se pudo guardar el resultado."),
        );
      } finally {
        setFormSubmitting(false);
      }
    },
    [token, formMode, editingRecord, closeForm, loadRecords],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      String(value).toLocaleLowerCase("es").includes(normalizedQuery),
    ),
  );
  const tableRows = buildStatisticsRows(
    visibleRecords,
    permissions,
    deletingId,
    (record) => setPendingDelete(record),
    (record) => {
      setEditingRecord(record);
      setFormMode("edit");
      setFormError(null);
    },
  );

  return (
    <section className="mx-auto w-full max-w-7xl min-w-0">
      <RecordsPageHeader
        title={
          embedded
            ? "Historial de pruebas estadísticas"
            : "Historial de registros"
        }
        showNavigation={!embedded}
        embedded={embedded}
        search={{
          query,
          onChange: setQuery,
          count: visibleRecords.length,
          total: records.length,
          loading: loading || authLoading,
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 pb-4">
        {permissions.canCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingRecord(null);
              setFormMode("create");
              setFormError(null);
            }}
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

      {formMode && (
        <StatisticsRecordForm
          key={editingRecord?.id ?? "create"}
          mode={formMode}
          initialValues={
            editingRecord
              ? {
                  testType: editingRecord.testType,
                  variable: editingRecord.variable,
                  statistic: editingRecord.statistic,
                  pValue: editingRecord.pValue,
                  interpretation: editingRecord.interpretation,
                }
              : undefined
          }
          submitting={formSubmitting}
          error={formError}
          onSubmit={(values) => void handleFormSubmit(values)}
          onCancel={closeForm}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar resultado"
        description={
          pendingDelete
            ? `¿Eliminar el resultado "${pendingDelete.variable}"?`
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
        ariaLabel="Registro de Pruebas Estadísticas"
        loading={loading || authLoading}
        tableClassName="min-w-[820px]"
        columns={[
          { key: "testType", label: "Prueba", align: "center" },
          { key: "variable", label: "Variable", align: "center" },
          { key: "statistic", label: "Estadístico", align: "center" },
          { key: "pValue", label: "P", align: "center" },
          { key: "interpretation", label: "Interpretación", align: "center" },
          { key: "createdBy", label: "Creado por", align: "center" },
          { key: "createdAt", label: "Fecha", align: "center" },
          { key: "actions", label: "Acciones", align: "center" },
        ]}
        rows={tableRows}
        getRowKey={(_, index) => visibleRecords[index]?.id ?? index}
        emptyMessage={
          query.trim()
            ? RECORD_WORKSPACE_COPY.emptySearch
            : "No hay pruebas estadísticas registradas."
        }
      />
    </section>
  );
}

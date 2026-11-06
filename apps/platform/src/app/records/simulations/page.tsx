"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Buttons";
import { Table } from "@/components/molecules/Table";
import { showToast } from "@/components/molecules/Toast";
import { useAuth } from "@/lib/auth";
import { friendlyErrorMessage } from "@/lib/apiErrors";
import { normalizeRole } from "@/entities/user";
import {
  getRecordPermissions,
  type RecordPermissions,
} from "@/lib/recordPermissions";
import {
  fetchSimulationRecords,
  formatRecordDate,
  updateSimulationRecord,
} from "@/lib/recordsApi";
import type {
  SimulationRecord,
  SimulationRecordStatus,
} from "@/lib/recordsMockData";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { RECORD_WORKSPACE_COPY } from "@/constants/recordHistory";
import { MODULE_DESCRIPTIONS } from "@/constants/moduleDescriptions";
import { RecordsPageHeader } from "../components/RecordsPageHeader";
import { RecordActionsCell } from "../components/RecordActionsCell";
import { RecordDateForm } from "../components/RecordDateForm";
import { SimulationRecordDialog } from "../components/SimulationRecordDialog";

const STATUS_LABELS: Record<SimulationRecordStatus, string> = {
  completada: "Terminado",
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
  openDetail: (recordId: string) => void,
) {
  return records.map((record) => ({
    patientId: (
      <Link
        href={`/records/simulations/${encodeURIComponent(record.id)}`}
        className="block text-center font-medium text-primary-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        {record.patientId}
      </Link>
    ),
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
      />
    ),
  }));
}

export default function SimulationsRecordsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [records, setRecords] = useState<SimulationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SimulationRecord | null>(
    null,
  );
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const permissions = getRecordPermissions(
    normalizeRole(user?.role),
    "simulations",
  );
  const fallbackUser = user?.username ?? "";
  const router = useRouter();
  const isRecordsPanel = usePathname().startsWith("/records");

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

  async function handleFormSubmit(createdAt: string) {
    if (!token || !editingRecord) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      await updateSimulationRecord(token, editingRecord.id, { createdAt });
      setRecords((current) =>
        current.map((item) =>
          item.id === editingRecord.id ? { ...item, createdAt } : item,
        ),
      );
      setEditingRecord(null);
    } catch (err) {
      setFormError(friendlyErrorMessage(err, "No se pudo guardar la fecha."));
    } finally {
      setFormSubmitting(false);
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const visibleRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      String(value).toLocaleLowerCase("es").includes(normalizedQuery),
    ),
  );
  const tableRows = buildSimulationRows(
    visibleRecords,
    permissions,
    (recordId) =>
      router.push(`/records/simulations/${encodeURIComponent(recordId)}`),
  );

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0">
      <RecordsPageHeader
        title={isRecordsPanel ? "Historial de registros" : "Simulaciones"}
        expandableDescription={
          isRecordsPanel ? undefined : MODULE_DESCRIPTIONS.simulation
        }
        showNavigation={isRecordsPanel}
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
            onClick={() => setDialogOpen(true)}
          >
            <FiPlus className="mr-1.5" />
            Nueva simulación
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

      {editingRecord && token && (
        <RecordDateForm
          key={editingRecord.id}
          kind="simulation"
          recordId={editingRecord.id}
          token={token}
          createdAt={editingRecord.createdAt}
          submitting={formSubmitting}
          error={formError}
          onSubmit={(value) => void handleFormSubmit(value)}
          onCancel={() => setEditingRecord(null)}
        />
      )}
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
        getRowKey={(_, index) => visibleRecords[index]?.id ?? index}
        emptyMessage={
          query.trim()
            ? RECORD_WORKSPACE_COPY.emptySearch
            : "No hay simulaciones registradas."
        }
      />
    </main>
  );
}

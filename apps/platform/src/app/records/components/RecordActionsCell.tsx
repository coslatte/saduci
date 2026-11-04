"use client";

import { Badge } from "@/components/atoms/Badge";
import { IconButton } from "@/components/atoms/Buttons";
import { FiEdit2, FiEye, FiTrash2 } from "react-icons/fi";
import type { RecordPermissions } from "@/lib/recordPermissions";

interface RecordActionsCellProps {
  permissions: RecordPermissions;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

/**
 * Renders the contextual actions available for a record row.
 * Buttons are shown only when the action handler exists and the role permits it.
 */
export function RecordActionsCell({
  permissions,
  onView,
  onEdit,
  onDelete,
  isDeleting = false,
}: RecordActionsCellProps) {
  const showView = permissions.canView && !!onView;
  const showEdit = permissions.canEdit && !!onEdit;
  const showDelete = permissions.canDelete && !!onDelete;

  if (!showView && !showEdit && !showDelete) {
    return (
      <Badge status="default" className="text-slate-500">
        Solo lectura
      </Badge>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {showView && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<FiEye />}
          aria-label="Ver registro"
          onClick={onView}
        />
      )}
      {showEdit && (
        <IconButton
          variant="ghost"
          size="sm"
          icon={<FiEdit2 />}
          aria-label="Editar registro"
          onClick={onEdit}
        />
      )}
      {showDelete && (
        <IconButton
          variant="danger"
          size="sm"
          icon={<FiTrash2 />}
          aria-label="Eliminar registro"
          disabled={isDeleting}
          onClick={onDelete}
        />
      )}
    </div>
  );
}

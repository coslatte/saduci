import type { Role } from "@/lib/types";

export type RecordResource = "simulations" | "predictions" | "statistics";

export interface RecordPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function getRecordPermissions(
  role: Role | undefined,
  _resource: RecordResource,
): RecordPermissions {
  return {
    canView: true,
    canCreate: true,
    canEdit: role === "Administrador" || role === "Especialista",
    canDelete: false,
  };
}

export function getRecordRoleHint(_role: Role | undefined): string {
  return "Los registros no se pueden eliminar.";
}

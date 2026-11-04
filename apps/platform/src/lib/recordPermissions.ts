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
  resource: RecordResource,
): RecordPermissions {
  const normalizedRole = role ?? "Médico";

  if (normalizedRole === "Administrador") {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    };
  }

  if (normalizedRole === "Especialista") {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: resource !== "simulations",
    };
  }

  return {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  };
}

export function getRecordRoleHint(role: Role | undefined): string {
  const normalizedRole = role ?? "Médico";

  if (normalizedRole === "Administrador") {
    return "Acceso completo: puede eliminar cualquier registro.";
  }

  if (normalizedRole === "Especialista") {
    return "Puede crear y editar registros. No puede eliminar simulaciones.";
  }

  return "Solo lectura: puede consultar las tablas de registros.";
}

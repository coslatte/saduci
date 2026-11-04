export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuperuser: boolean;
  avatar?: string | null;
  createdAt?: string;
}

export type Role = "Administrador" | "Especialista" | "Médico" | "Analista";

export const ROLE_LABELS: Record<Role, string> = {
  Administrador: "Administrador",
  Especialista: "Especialista",
  Médico: "Médico",
  Analista: "Analista",
};

export function normalizeRole(
  role: string | undefined,
  isSuperuser?: boolean,
): Role {
  if (isSuperuser) return "Administrador";
  const normalized = (role ?? "").trim();

  if (
    normalized === "Administrador" ||
    normalized === "Especialista" ||
    normalized === "Médico" ||
    normalized === "Analista"
  ) {
    return normalized;
  }

  const upper = normalized.toUpperCase();
  if (upper === "ADMIN" || upper === "SYSTEM ADMIN") {
    return "Administrador";
  }
  if (upper === "ESPECIALISTA") {
    return "Especialista";
  }
  if (upper === "MEDICO") {
    return "Médico";
  }
  if (upper === "ANALISTA") {
    return "Analista";
  }
  return "Médico";
}

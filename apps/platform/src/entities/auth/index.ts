import { normalizeRole } from "@/entities/user";

export { normalizeRole } from "@/entities/user";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isSuperuser: boolean;
  avatar?: string | null;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: number | string;
    username: string;
    email: string;
    role?: string;
    is_active?: boolean;
    is_superuser?: boolean;
    avatar?: string | null;
  };
}

export function formatDisplayName(identifier: string): string {
  const base = identifier
    .split(/[@._-]+/)
    .filter(Boolean)
    .join(" ");

  return base.replace(/\b\w/g, (char) => char.toUpperCase()) || identifier;
}

export function mapBackendUser(user: AuthResponse["user"]): AuthUser {
  const isSuperuser = user.is_superuser === true;
  const role = normalizeRole(user.role, isSuperuser);

  return {
    id: String(user.id),
    username: user.username,
    name: formatDisplayName(user.username),
    email: user.email,
    role,
    isActive: user.is_active ?? true,
    isSuperuser,
    avatar: user.avatar ?? undefined,
  };
}

export function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    role: normalizeRole(user.role, user.isSuperuser),
  };
}

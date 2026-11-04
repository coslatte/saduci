import type { User } from "@/lib/auth";
import { normalizeRole } from "@/entities/user";

/**
 * A session reaches this guard either straight from the login payload or
 * restored from the httpOnly cookie, so the role is normalized here instead of
 * trusting a single spelling. The backend emits `"ADMIN"`; the UI speaks
 * `"Administrador"`. Comparing the raw string only made a real administrator
 * fail the check and get redirected away from `/admin/users`.
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.isSuperuser === true ||
    normalizeRole(user.role, user.isSuperuser) === "Administrador"
  );
}

export default isAdmin;

import "../setup";
import { describe, expect, it } from "bun:test";
import { isAdmin } from "@/lib/adminGuard";
import { mapBackendUser, normalizeRole } from "@/entities/auth";
import type { User } from "@/lib/auth";

/**
 * The gateway answers in snake_case. The provider used to read camelCase keys
 * from that payload, so `isSuperuser` arrived `undefined` and the role stayed
 * `"ADMIN"`. With both facts wrong, `isAdmin` rejected a real administrator
 * and `/admin/users` redirected straight back to `/home`, which looked exactly
 * like "the buttons do not navigate".
 */
const GATEWAY_ADMIN = {
  id: 1,
  username: "admin",
  email: "admin@saduci.com",
  role: "ADMIN",
  is_active: true,
  is_superuser: true,
  avatar: null,
};

describe("mapBackendUser", () => {
  it("traduce el payload snake_case del gateway al modelo del cliente", () => {
    const user = mapBackendUser(GATEWAY_ADMIN);

    expect(user.isSuperuser).toBe(true);
    expect(user.isActive).toBe(true);
    expect(user.id).toBe("1");
    expect(user.role).toBe("Administrador");
    expect(user.username).toBe("admin");
  });

  it("un no superusuario conserva su rol traducido", () => {
    const user = mapBackendUser({
      ...GATEWAY_ADMIN,
      role: "MEDICO",
      is_superuser: false,
    });

    expect(user.isSuperuser).toBe(false);
    expect(user.role).toBe("Médico");
  });
});

describe("isAdmin", () => {
  const base = {
    username: "admin",
    email: "admin@saduci.com",
    name: "Admin",
    isActive: true,
    isSuperuser: false,
    avatar: null,
  };

  it("acepta a un administrador mapeado desde el gateway", () => {
    const user = mapBackendUser(GATEWAY_ADMIN);
    expect(isAdmin(user)).toBe(true);
  });

  it("acepta el rol crudo del backend sin normalizar antes", () => {
    // Regression: only the literal "Administrador" used to pass, so a session
    // that reached the guard with the raw "ADMIN" was treated as a non-admin.
    const raw = { ...base, id: "1", role: "ADMIN" } as User;
    expect(isAdmin(raw)).toBe(true);
  });

  it("acepta por isSuperuser aunque el rol no sea de administrador", () => {
    const superuser = { ...base, id: "1", role: "Médico", isSuperuser: true };
    expect(isAdmin(superuser)).toBe(true);
  });

  it("rechaza a un medico", () => {
    const medico = { ...base, id: "2", role: "Médico" };
    expect(isAdmin(medico)).toBe(false);
  });

  it("rechaza a un usuario ausente", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe("normalizeRole", () => {
  it("cubre las grafias que emite el backend", () => {
    expect(normalizeRole("ADMIN")).toBe("Administrador");
    expect(normalizeRole("MEDICO")).toBe("Médico");
    expect(normalizeRole("ESPECIALISTA")).toBe("Especialista");
    expect(normalizeRole("Administrador")).toBe("Administrador");
  });

  it("un superuser es administrador aunque el rol no cuadre", () => {
    expect(normalizeRole("MEDICO", true)).toBe("Administrador");
  });
});

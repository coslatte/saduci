import "../../setup";
import { render } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

const replace = mock(() => {});
let pathname = "/";
let authState = {
  user: null as null | { id: string; name: string; role: string },
  isAuthenticated: false,
  isLoading: false,
};

mock.module("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: () => {}, replace, back: () => {} }),
}));

mock.module("@/components/molecules/Toast", () => ({
  Toaster: () => null,
  showToast: () => {},
}));

mock.module("@/lib/auth", () => ({
  useAuth: () => ({
    ...authState,
    token: null,
    sessionError: null,
    login: async () => {},
    register: async () => {},
    logout: () => {},
  }),
}));

import ShellController from "@/app/components/ShellController";

describe("ShellController access control", () => {
  it("redirects unauthenticated users away from protected routes", () => {
    pathname = "/";
    authState = { user: null, isAuthenticated: false, isLoading: false };
    replace.mockClear();

    const { container } = render(
      <ShellController>
        <div>Contenido privado</div>
      </ShellController>,
    );

    expect(container.textContent?.includes("Contenido privado")).toBe(false);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("renders the app shell for authenticated users", () => {
    pathname = "/home";
    authState = {
      user: { id: "1", name: "Admin", role: "Administrador" },
      isAuthenticated: true,
      isLoading: false,
    };

    const { container } = render(
      <ShellController>
        <div>Contenido privado</div>
      </ShellController>,
    );

    expect(container.textContent?.includes("Contenido privado")).toBe(true);
    expect(container.querySelector("main")).toBeTruthy();
    expect(container.querySelector("footer")).toBeNull();
    expect(container.textContent).not.toContain("©");
  });

  it("renders public routes without authentication", () => {
    pathname = "/register";
    authState = { user: null, isAuthenticated: false, isLoading: false };

    const { container } = render(
      <ShellController>
        <div>Contenido público</div>
      </ShellController>,
    );

    expect(container.textContent?.includes("Contenido público")).toBe(true);
  });

  it("sends an authenticated visitor on the login screen to the same target the login form would pick", () => {
    // Regression: the login form used to navigate on its own while this
    // controller pushed a hardcoded "/home", so the two could disagree once
    // `?redirect=` was present. Both must resolve the same destination.
    pathname = "/login";
    authState = {
      user: { id: "1", name: "Admin", role: "Administrador" },
      isAuthenticated: true,
      isLoading: false,
    };
    replace.mockClear();

    const { container } = render(
      <ShellController>
        <div>Formulario</div>
      </ShellController>,
    );

    expect(replace).toHaveBeenCalledWith("/home");
    // While the redirect is in flight the public route shows the loading
    // skeleton; it must never keep rendering the form of a signed-in user.
    expect(container.textContent).toContain("Verificando tu sesión");
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    expect(container.textContent).not.toContain("Formulario");
  });
});

import "../../setup";
import { render } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

mock.module("sileo", () => ({
  Toaster: () => null,
  sileo: {
    success: () => {},
    error: () => {},
  },
}));

mock.module("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
  }),
}));

import ShellController from "@/app/components/ShellController";

describe("ShellController public access", () => {
  it("renders app content without requiring auth", () => {
    const { container } = render(
      <ShellController>
        <div>Contenido público</div>
      </ShellController>,
    );

    expect(container.textContent?.includes("Contenido público")).toBe(true);
    expect(container.querySelector("main")).toBeTruthy();
  });
});

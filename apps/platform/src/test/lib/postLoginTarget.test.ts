import "../setup";
import { describe, expect, it } from "bun:test";
import {
  DEFAULT_POST_LOGIN_PATH,
  resolvePostLoginTarget,
} from "@/lib/postLoginTarget";

describe("resolvePostLoginTarget", () => {
  it("defaults to the home page when no target is present", () => {
    expect(resolvePostLoginTarget("")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(resolvePostLoginTarget("?otro=1")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("returns the path the visitor originally asked for", () => {
    expect(resolvePostLoginTarget("?redirect=%2Frecords%2Fpredictions")).toBe(
      "/records/predictions",
    );
  });

  it("preserves the query string of the requested path", () => {
    expect(resolvePostLoginTarget("?redirect=%2Fsettings%3Ftab%3Dperfil")).toBe(
      "/settings?tab=perfil",
    );
  });

  it("refuses to send the browser off-site", () => {
    expect(resolvePostLoginTarget("?redirect=https%3A%2F%2Fevil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(resolvePostLoginTarget("?redirect=%2F%2Fevil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(resolvePostLoginTarget("?redirect=http%3A%2F%2Fevil.example")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it("refuses a target that would bounce back to a public route", () => {
    expect(resolvePostLoginTarget("?redirect=%2Flogin")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(resolvePostLoginTarget("?redirect=%2Fregister")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(
      resolvePostLoginTarget("?redirect=%2Flogin%3Fredirect%3D%2Fhome"),
    ).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});

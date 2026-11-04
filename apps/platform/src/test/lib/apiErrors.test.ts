import "../setup";
import { describe, expect, it } from "bun:test";
import {
  ApiError,
  classifyError,
  friendlyErrorMessage,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
} from "@/lib/apiErrors";
import { HttpError } from "@/lib/types/http-error";

describe("classifyError", () => {
  it("classifies connection failures", () => {
    expect(classifyError(new ApiError("down", 0))).toBe("network");
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
  });

  it("classifies auth failures", () => {
    expect(classifyError(new ApiError("no", 401))).toBe("auth");
    expect(classifyError(new HttpError(403, "forbidden"))).toBe("auth");
  });

  it("classifies validation failures", () => {
    expect(classifyError(new ApiError("bad", 400))).toBe("validation");
    expect(classifyError(new ApiError("bad", 422))).toBe("validation");
  });

  it("classifies server failures", () => {
    expect(classifyError(new ApiError("boom", 500))).toBe("server");
    expect(classifyError(new HttpError(503, "unavailable"))).toBe("server");
  });

  it("falls back to unknown", () => {
    expect(classifyError(new Error("weird"))).toBe("unknown");
  });
});

describe("friendlyErrorMessage", () => {
  it("replaces network failures with the shared message", () => {
    expect(
      friendlyErrorMessage(new TypeError("Failed to fetch"), "fallback"),
    ).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("keeps a real error message", () => {
    expect(
      friendlyErrorMessage(new Error("Credenciales inválidas"), "fallback"),
    ).toBe("Credenciales inválidas");
  });

  it("uses the fallback for empty errors", () => {
    expect(friendlyErrorMessage(new Error("  "), "fallback")).toBe("fallback");
    expect(friendlyErrorMessage(null, "fallback")).toBe("fallback");
  });
});

describe("isNetworkFailure", () => {
  it("detects network-level errors", () => {
    expect(isNetworkFailure(new ApiError("x", 0))).toBe(true);
    expect(isNetworkFailure(new ApiError("x", 500))).toBe(false);
    expect(isNetworkFailure(new Error("fetch failed"))).toBe(true);
  });
});

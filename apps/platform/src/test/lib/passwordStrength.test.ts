import "../setup";
import { describe, expect, it } from "bun:test";
import { evaluatePasswordStrength } from "@/lib/passwordStrength";

describe("evaluatePasswordStrength", () => {
  it("returns an empty label for no input", () => {
    expect(evaluatePasswordStrength("")).toEqual({ score: 0, label: "" });
  });

  it("scores by length and character variety", () => {
    expect(evaluatePasswordStrength("abc").score).toBe(0);
    expect(evaluatePasswordStrength("abcdefgh").score).toBe(1);
    expect(evaluatePasswordStrength("Abcdefgh").score).toBe(2);
    expect(evaluatePasswordStrength("Abcdefg1").score).toBe(3);
    expect(evaluatePasswordStrength("Abcdefg1!").score).toBe(4);
  });

  it("labels the score", () => {
    expect(evaluatePasswordStrength("Abcdefg1!").label).toBe("Muy fuerte");
    expect(evaluatePasswordStrength("abc").label).toBe("Muy débil");
  });
});

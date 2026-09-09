import { describe, expect, it } from "vitest";
import { matchesConfirmationPhrase } from "./dangerous-confirm";

describe("matchesConfirmationPhrase — the DangerousConfirm submit gate", () => {
  it("does not match before anything is typed", () => {
    expect(matchesConfirmationPhrase("", "Laura Díaz")).toBe(false);
  });

  it("does not match a partial or wrong phrase", () => {
    expect(matchesConfirmationPhrase("Laura", "Laura Díaz")).toBe(false);
    expect(matchesConfirmationPhrase("DELET", "DELETE")).toBe(false);
  });

  it("matches the exact phrase", () => {
    expect(matchesConfirmationPhrase("Laura Díaz", "Laura Díaz")).toBe(true);
    expect(matchesConfirmationPhrase("DELETE", "DELETE")).toBe(true);
  });

  it("ignores surrounding whitespace on the typed value", () => {
    expect(matchesConfirmationPhrase("  Laura Díaz  ", "Laura Díaz")).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(matchesConfirmationPhrase("delete", "DELETE")).toBe(false);
  });

  it("never matches when the required phrase is blank", () => {
    expect(matchesConfirmationPhrase("", "")).toBe(false);
    expect(matchesConfirmationPhrase("   ", "   ")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parseControlOccurrenceRule, periodMilliseconds } from "./control-occurrence-rule.js";

describe("parseControlOccurrenceRule", () => {
  it("accepts an uncapped rule", () => {
    expect(parseControlOccurrenceRule({ mode: "uncapped" })).toEqual({ mode: "uncapped" });
  });

  it("accepts a valid capped rule and normalises it", () => {
    expect(
      parseControlOccurrenceRule({
        mode: "capped",
        count: 4,
        period: { every: 24, unit: "hours" },
      }),
    ).toEqual({ mode: "capped", count: 4, period: { every: 24, unit: "hours" } });
  });

  it("rejects a capped rule whose count is not a positive integer", () => {
    expect(() =>
      parseControlOccurrenceRule({
        mode: "capped",
        count: 0,
        period: { every: 1, unit: "days" },
      }),
    ).toThrow();
    expect(() =>
      parseControlOccurrenceRule({
        mode: "capped",
        count: 1.5,
        period: { every: 1, unit: "days" },
      }),
    ).toThrow();
  });

  it("rejects a capped rule whose period.every is not a positive integer", () => {
    expect(() =>
      parseControlOccurrenceRule({
        mode: "capped",
        count: 2,
        period: { every: 0, unit: "days" },
      }),
    ).toThrow();
  });

  it("rejects a capped rule with an unknown period unit", () => {
    expect(() =>
      parseControlOccurrenceRule({
        mode: "capped",
        count: 2,
        period: { every: 1, unit: "months" as never },
      }),
    ).toThrow();
  });
});

describe("periodMilliseconds", () => {
  it("multiplies the unit by every and the repetition count", () => {
    expect(periodMilliseconds({ every: 2, unit: "days" }, 3)).toBe(2 * 3 * 24 * 60 * 60 * 1000);
    expect(periodMilliseconds({ every: 1, unit: "weeks" }, 1)).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

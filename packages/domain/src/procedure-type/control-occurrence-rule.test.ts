import { describe, expect, it } from "vitest";
import {
  expectedRecordings,
  parseControlOccurrenceRule,
  periodMilliseconds,
  timepointOffsetMilliseconds,
  type ControlOccurrenceRule,
} from "./control-occurrence-rule.js";

const DAY = 24 * 60 * 60 * 1000;

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

describe("parseControlOccurrenceRule — scheduled (ADR 0031)", () => {
  it("accepts explicit timepoints and sorts them ascending", () => {
    expect(
      parseControlOccurrenceRule({ mode: "scheduled", unit: "days", offsets: [7, 1, 3] }),
    ).toEqual({ mode: "scheduled", unit: "days", offsets: [1, 3, 7] });
  });

  it("accepts a single timepoint", () => {
    expect(parseControlOccurrenceRule({ mode: "scheduled", unit: "hours", offsets: [12] })).toEqual(
      {
        mode: "scheduled",
        unit: "hours",
        offsets: [12],
      },
    );
  });

  it("rejects an empty schedule", () => {
    expect(() =>
      parseControlOccurrenceRule({ mode: "scheduled", unit: "days", offsets: [] }),
    ).toThrow(/at least one/);
  });

  it("rejects a missing offsets list (malformed body)", () => {
    expect(() => parseControlOccurrenceRule({ mode: "scheduled", unit: "days" } as never)).toThrow(
      /at least one/,
    );
  });

  it("rejects a timepoint that is zero, negative or fractional", () => {
    for (const bad of [0, -1, 2.5, Number.NaN]) {
      expect(() =>
        parseControlOccurrenceRule({ mode: "scheduled", unit: "days", offsets: [1, bad] }),
      ).toThrow(/whole number of at least 1/);
    }
  });

  it("rejects a repeated timepoint", () => {
    expect(() =>
      parseControlOccurrenceRule({ mode: "scheduled", unit: "days", offsets: [3, 1, 3] }),
    ).toThrow(/more than once/);
  });

  it("rejects an unknown unit", () => {
    expect(() =>
      parseControlOccurrenceRule({ mode: "scheduled", unit: "months" as never, offsets: [1] }),
    ).toThrow(/hours, days or weeks/);
  });

  it("does not share the caller's offsets array", () => {
    const offsets = [1, 3];
    const rule = parseControlOccurrenceRule({ mode: "scheduled", unit: "days", offsets });
    offsets.push(99);
    expect(rule).toEqual({ mode: "scheduled", unit: "days", offsets: [1, 3] });
  });
});

describe("expectedRecordings", () => {
  it("is null for uncapped, the count for capped, the number of timepoints for scheduled", () => {
    expect(expectedRecordings({ mode: "uncapped" })).toBeNull();
    expect(
      expectedRecordings({ mode: "capped", count: 4, period: { every: 1, unit: "days" } }),
    ).toBe(4);
    expect(expectedRecordings({ mode: "scheduled", unit: "days", offsets: [1, 3, 7] })).toBe(3);
  });
});

describe("timepointOffsetMilliseconds", () => {
  it("places the k-th capped recording at k periods after the surgery", () => {
    const rule = { mode: "capped", count: 3, period: { every: 2, unit: "days" } } as const;
    expect(timepointOffsetMilliseconds(rule, 1)).toBe(2 * DAY);
    expect(timepointOffsetMilliseconds(rule, 3)).toBe(6 * DAY);
  });

  it("places the k-th scheduled recording at its own timepoint", () => {
    const rule: ControlOccurrenceRule = { mode: "scheduled", unit: "days", offsets: [1, 3, 7] };
    expect(timepointOffsetMilliseconds(rule, 1)).toBe(1 * DAY);
    expect(timepointOffsetMilliseconds(rule, 2)).toBe(3 * DAY);
    expect(timepointOffsetMilliseconds(rule, 3)).toBe(7 * DAY);
  });

  it("returns null past the last expected recording, and for uncapped", () => {
    expect(
      timepointOffsetMilliseconds({ mode: "scheduled", unit: "days", offsets: [1, 3] }, 3),
    ).toBeNull();
    expect(
      timepointOffsetMilliseconds(
        { mode: "capped", count: 2, period: { every: 1, unit: "days" } },
        3,
      ),
    ).toBeNull();
    expect(timepointOffsetMilliseconds({ mode: "uncapped" }, 1)).toBeNull();
  });
});

describe("periodMilliseconds", () => {
  it("multiplies the unit by every and the repetition count", () => {
    expect(periodMilliseconds({ every: 2, unit: "days" }, 3)).toBe(2 * 3 * 24 * 60 * 60 * 1000);
    expect(periodMilliseconds({ every: 1, unit: "weeks" }, 1)).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

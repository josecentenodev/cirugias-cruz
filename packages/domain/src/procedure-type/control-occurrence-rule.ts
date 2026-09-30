import { DomainError } from "../shared/domain-error.js";

/**
 * How often a control definition is expected to be recorded on a Surgery
 * (ADR 0026, amended by ADR 0031).
 *
 * - `uncapped` — recorded zero-to-many times per Surgery, at the
 *   physician's discretion.
 * - `capped` — exactly `count` recordings are expected per Surgery, at
 *   successive multiples of `period` from the Surgery's performed date
 *   (e.g. 4 recordings, every 24 h).
 * - `scheduled` — one recording expected at each explicit timepoint in
 *   `offsets`, counted in `unit` from the Surgery's performed date (e.g.
 *   days 1, 3 and 7). Expects exactly `offsets.length` recordings.
 *
 * Both bounded modes share the same write invariant: the recording past
 * the expected number is rejected (enforced in `Surgery.recordControl`).
 * The schedule itself is a read-side projection only and never gates a
 * write — an off-schedule recording is allowed.
 */
export type ControlPeriodUnit = "hours" | "days" | "weeks";

export const CONTROL_PERIOD_UNITS: readonly ControlPeriodUnit[] = ["hours", "days", "weeks"];

export interface ControlPeriod {
  every: number;
  unit: ControlPeriodUnit;
}

export type ControlOccurrenceRule =
  | { mode: "uncapped" }
  | { mode: "capped"; count: number; period: ControlPeriod }
  | { mode: "scheduled"; unit: ControlPeriodUnit; offsets: number[] };

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

const UNIT_MESSAGE = "A control type's period must be in hours, days or weeks";

/**
 * Validates a raw occurrence-rule shape and returns a normalised copy.
 * Throws `DomainError` on any incoherence.
 */
export function parseControlOccurrenceRule(rule: ControlOccurrenceRule): ControlOccurrenceRule {
  if (rule.mode === "uncapped") {
    return { mode: "uncapped" };
  }

  if (rule.mode === "scheduled") {
    return parseScheduledRule(rule);
  }

  if (rule.mode !== "capped") {
    throw new DomainError(
      "A control type's recording rule must be uncapped, capped or on specific timepoints",
    );
  }

  if (!isPositiveInteger(rule.count)) {
    throw new DomainError(
      "A capped control type needs a whole number of at least 1 expected recording",
    );
  }
  if (!rule.period || !isPositiveInteger(rule.period.every)) {
    throw new DomainError("A capped control type's interval must be a whole number of at least 1");
  }
  if (!CONTROL_PERIOD_UNITS.includes(rule.period.unit)) {
    throw new DomainError(UNIT_MESSAGE);
  }

  return {
    mode: "capped",
    count: rule.count,
    period: { every: rule.period.every, unit: rule.period.unit },
  };
}

function parseScheduledRule(rule: { unit: ControlPeriodUnit; offsets: number[] }) {
  if (!Array.isArray(rule.offsets) || rule.offsets.length === 0) {
    throw new DomainError("A scheduled control type needs at least one timepoint");
  }
  if (!rule.offsets.every(isPositiveInteger)) {
    throw new DomainError("Each timepoint must be a whole number of at least 1");
  }
  if (new Set(rule.offsets).size !== rule.offsets.length) {
    throw new DomainError("A timepoint cannot be listed more than once");
  }
  if (!CONTROL_PERIOD_UNITS.includes(rule.unit)) {
    throw new DomainError(UNIT_MESSAGE);
  }

  return {
    mode: "scheduled" as const,
    unit: rule.unit,
    offsets: [...rule.offsets].sort((a, b) => a - b),
  };
}

const MS_PER_UNIT: Record<ControlPeriodUnit, number> = {
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

/** Milliseconds represented by `k` repetitions of a control period. */
export function periodMilliseconds(period: ControlPeriod, repetitions: number): number {
  return MS_PER_UNIT[period.unit] * period.every * repetitions;
}

/** Recordings expected per Surgery — `null` when the rule is uncapped (no expectation, no cap). */
export function expectedRecordings(rule: ControlOccurrenceRule): number | null {
  switch (rule.mode) {
    case "uncapped":
      return null;
    case "capped":
      return rule.count;
    case "scheduled":
      return rule.offsets.length;
  }
}

/**
 * Milliseconds after the Surgery's performed date at which the `k`-th
 * (1-based) expected recording is due — `null` for an uncapped rule or
 * once `k` is past the last expected recording.
 */
export function timepointOffsetMilliseconds(rule: ControlOccurrenceRule, k: number): number | null {
  const expected = expectedRecordings(rule);
  if (expected === null || k < 1 || k > expected) {
    return null;
  }
  if (rule.mode === "scheduled") {
    return MS_PER_UNIT[rule.unit] * (rule.offsets[k - 1] ?? 0);
  }
  /* c8 ignore next -- `expected !== null` already excludes uncapped */
  if (rule.mode !== "capped") return null;
  return periodMilliseconds(rule.period, k);
}

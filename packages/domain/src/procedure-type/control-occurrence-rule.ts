import { DomainError } from "../shared/domain-error.js";

/**
 * How often a control definition is expected to be recorded on a Surgery
 * (ADR 0026).
 *
 * - `uncapped` — today's behaviour: recorded zero-to-many times per
 *   Surgery, at the physician's discretion.
 * - `capped` — exactly `count` recordings are expected per Surgery, at
 *   successive multiples of `period` from the Surgery's performed date.
 *   The `count + 1`-th recording is rejected (enforced in
 *   `Surgery.recordControl`); the schedule itself is a read-side
 *   projection only and never gates a write.
 */
export type ControlPeriodUnit = "hours" | "days" | "weeks";

export const CONTROL_PERIOD_UNITS: readonly ControlPeriodUnit[] = ["hours", "days", "weeks"];

export interface ControlPeriod {
  every: number;
  unit: ControlPeriodUnit;
}

export type ControlOccurrenceRule =
  { mode: "uncapped" } | { mode: "capped"; count: number; period: ControlPeriod };

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * Validates a raw occurrence-rule shape and returns a normalised copy.
 * Throws `DomainError` on any incoherence.
 */
export function parseControlOccurrenceRule(rule: ControlOccurrenceRule): ControlOccurrenceRule {
  if (rule.mode === "uncapped") {
    return { mode: "uncapped" };
  }

  if (rule.mode !== "capped") {
    throw new DomainError("A control occurrence rule must be either uncapped or capped");
  }

  if (!isPositiveInteger(rule.count)) {
    throw new DomainError("A capped control requires a count that is an integer >= 1");
  }
  if (!rule.period || !isPositiveInteger(rule.period.every)) {
    throw new DomainError("A capped control requires a period 'every' that is an integer >= 1");
  }
  if (!CONTROL_PERIOD_UNITS.includes(rule.period.unit)) {
    throw new DomainError("A capped control period unit must be one of: hours, days, weeks");
  }

  return {
    mode: "capped",
    count: rule.count,
    period: { every: rule.period.every, unit: rule.period.unit },
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

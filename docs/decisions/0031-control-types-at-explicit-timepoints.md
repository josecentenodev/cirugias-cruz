# 0031 — Control types may expect their recordings at explicit timepoints

## Status

Established (current iteration). **Amends [0026](0026-control-types-cap-and-measurement-period.md)**
— resolves the "explicit per-timepoint offsets rather than a fixed period"
item that 0026 left in "Not decided here" pending a real case. Every
other part of 0026 (as already amended by
[0030](0030-control-definition-mandatory-no-ad-hoc-controls.md)) is
unchanged. Interacts with
[0027](0027-procedure-type-scheme-editable-frozen-once-used.md): a
scheduled control type freezes once a Control references it, exactly like
a capped one.

## Context

0026 gave a bounded control type one shape only: `N` recordings at
successive multiples of a fixed period (`performedAt + k · period`). In
manual testing on 2026-09-30 the product owner hit a real follow-up
regimen that shape cannot express:

> "A veces hay casos que son así: al primer día, al tercero y al séptimo."

Days 1, 3 and 7 (or 3, 5 and 8) are not multiples of any single period.
The only workaround was an uncapped control type — which loses the cap
and the "next due" indicator, the whole point of 0026.

## Decision

The occurrence rule gains a third mode:

```
occurrenceRule =
  | { mode: "uncapped" }
  | { mode: "capped", count: N, period: { every: P, unit: U } }
  | { mode: "scheduled", unit: U, offsets: [t1, t2, …] }      ← new
```

- `offsets` — the explicit timepoints, counted in `unit` from the
  Surgery's performed date (`performedAt + t · unit`). Each is a whole
  number ≥ 1; at least one; no duplicates. Stored ascending (the
  physician may type them in any order).
- `unit` — the same `"hours" | "days" | "weeks"` as 0026. **One unit per
  control type**: mixed units ("12 h, day 3, week 2") have no evidence of
  need; revisit only on a real case.
- A scheduled control type **expects exactly `offsets.length`
  recordings** and behaves as a capped one everywhere else: the
  `≤ N` write invariant in `Surgery.recordControl` (the recording past the
  last timepoint is rejected), the completeness / next-due projection
  (next due = the timepoint of recording `recorded + 1`), and the 0027
  freeze.
- As in 0026, the schedule **never gates a write**: an off-schedule
  recording is allowed. Recordings are counted, not matched to specific
  timepoints.
- No clinical content in code: the timepoints are physician-entered,
  like `N` and `period`.

A third mode, rather than widening `capped`, keeps every existing
`capped` row, wire payload and test valid as-is; Domain exposes
`expectedRecordings(rule)` and `timepointOffsetMilliseconds(rule, k)` so
Application never branches on the mode itself.

## Consequences

- **Domain** — `ControlOccurrenceRule` gains `scheduled`;
  `parseControlOccurrenceRule` validates it with physician-facing copy.
- **Application** — `recordControl` resolves the cap through
  `expectedRecordings`; `computeFollowUp` projects bounded (capped or
  scheduled) definitions through `timepointOffsetMilliseconds`.
- **Infrastructure** — additive migration
  `20260930120000_scheduled_control_timepoints`: an
  `occurrenceOffsets INTEGER[]` column on `control_definitions` (empty for
  existing rows). A scheduled row also fills `occurrenceCount`
  (= number of timepoints) and `occurrencePeriodUnit`. An unknown
  `occurrenceMode` read from the database now fails closed instead of
  silently reading as uncapped (which would lift a cap).
- **HTTP** — the control-definition body schema accepts
  `{ mode: "scheduled", unit, offsets }` (shape only; the rules above are
  Domain's).
- **Web** — the control-type form's "Recording cap" select offers
  "Capped — at specific timepoints", revealing a free-text timepoints
  input ("1, 3, 7") and a unit select; the list reads e.g. "Days 1, 3, 7
  after surgery".

## Not decided here

- Mixed units within one control type.
- Matching each recording to a specific timepoint (e.g. flagging "day 3
  was skipped") — still a presentation choice, as in 0026.
- A timepoint 0 ("the day of surgery") — rejected for now; no case has
  needed it.

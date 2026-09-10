# 0026 — Control definitions with an optional recording cap and measurement period

## Status

Established (current iteration). **New capability.** Builds on
[0004](0004-controls-not-followup-entity.md) (Control is an internal
entity of the Surgery aggregate), [0018](0018-customfield-value-representation.md)
/ [0019](0019-customfield-persistence-schema.md) (CustomField definitions
live inside the `ProcedureType` aggregate), and closes the "mandatory
`CONTROL`-scoped fields" / "fixed timepoints" gap noted in ADR 0018's
"Not decided here" and in
[`../domain/physician-prototype-analysis.md`](../domain/physician-prototype-analysis.md).
Companion to [0027](0027-procedure-type-scheme-editable-frozen-once-used.md).
Comes out of the 2026-09-09 product-owner session
([`../architecture/alignment-restructuring.md`](../architecture/alignment-restructuring.md)
§A2, walkthrough finding **F-03**).

**Implemented — Milestone 11 WP3** (merged to `main`): `ControlDefinition`
inside the `ProcedureType` aggregate; `Control.definitionId?`;
`Surgery.recordControl` enforces the `≤ N` cap per capped definition;
`computeFollowUp` gives the per-Surgery "recorded / next due"
projection on the get-surgery reads; migration
`20260909140000_add_control_definitions_and_optional_observations`
applied to the Railway Postgres; full quality gate green. Deviation:
`modify-control` does not take a `definitionId` — a Control is typed at
record time only (see `milestone-11-alignment-design.md` §1).

## Context

A `Control` is a generic timestamped entry (observations + datetime +
author + CustomField values) with **no type and no cardinality**. The
product owner needs some controls to be bounded:

> "Un control se puede cargar infinitas veces si no tiene tope de cargas.
> Cuando tiene tope de cargas, pasan a ser obligatorias las cargas —
> exactamente N — y deben tener un período de medición en el tiempo (por
> ejemplo cada 24 h, cada 48 h, cada 12 h)."

Example: a "Escala de Dolor" control recorded exactly 4 times, every
24 h. The platform must not know "pain scale" or "24 h" — the physician
defines it, same posture as CustomFields (ADR 0018 / 0022).

## Decision

### Control definitions belong to the ProcedureType scheme

A `ProcedureType` owns a set of **control definitions** alongside its
CustomField definitions — together these are its **control scheme**. A
control definition has:

- a `name` (physician-entered),
- its `CONTROL`-scoped CustomField set (as today),
- an **occurrence rule**.

### The occurrence rule: `uncapped` (default) or `capped`

```
occurrenceRule =
  | { mode: "uncapped" }
  | { mode: "capped", count: N, period: { every: P, unit: U } }
```

- `N` — a positive integer.
- `P` — a positive integer.
- `U` — `"hours" | "days" | "weeks"` (product owner, 2026-09-09 — hours
  alone is not enough).

**`uncapped` is the default** and is exactly today's behaviour: a control
of that definition may be recorded zero-to-many times per Surgery, at the
physician's discretion. Nothing regresses for existing usage.

### When `capped`

- **Exactly `N`** recordings of that definition are _expected_ per
  Surgery. Until all `N` exist, that Surgery's follow-up is **incomplete**
  for that definition. This is a **completeness projection surfaced for
  display** — it does **not** block anything. A Surgery with missing
  capped recordings is still a fully valid Surgery.
- Recording the **`N + 1`-th** control of that definition on that Surgery
  is **rejected**. This _is_ a write invariant, enforced inside
  `Surgery.recordControl` — Surgery owns its Controls and can count them.
- The cap is **per Surgery**, counting all authors together (physician +
  participating residents) — not per author.
- The `N` recordings are expected at successive multiples of `period`
  **from the Surgery's performed date** (product owner, 2026-09-09):
  expected timepoint `k` = `performedAt + k · period`, for `k = 1..N`.
  This schedule drives a "next due" indicator only.
- A recording whose datetime does **not** align with a scheduled slot is
  **allowed** (product owner, 2026-09-09). The period is a schedule the
  physician reads against, not a gate. Whether the UI visually flags an
  off-schedule recording is a presentation choice, not a domain rule.

### Ad-hoc controls stay valid

A `Control` **may** reference a control definition or **none**. A control
with no definition — free-text observations + datetime, as today — is
valid (product owner, 2026-09-09) and is uncapped by nature.

### No clinical content in code

`name`, `N`, `period` are all physician-entered. The platform ships no
pterygium-specific (or any specialty's) control definitions — same rule
as ADR 0011 / 0018 / 0022.

## Consequences

- **Domain** — a `ControlDefinition` concept inside the `ProcedureType`
  aggregate carrying the occurrence rule; `Control` gains an optional
  `definitionId`; `Surgery.recordControl` gains the "≤ N per capped
  definition" invariant and therefore needs to see the per-definition
  recording count of the Surgery it is called on.
- **Application** — `recordControl` / `modifyControl` accept an optional
  `definitionId`; a per-Surgery, per-definition **completeness / next-due
  projection** computed for read responses (leaning: computed on read,
  not stored).
- **Infrastructure** — schema + migration for control definitions under
  `procedure_types`, and `definitionId` on `controls`. The exact
  persistence shape (a real FK within the aggregate boundary vs. an
  id-only column mirroring the `SurgeryParticipant` /
  `research_study_surgeries` precedent) is an implementation decision, not
  fixed here.
- **HTTP** — control routes accept `definitionId`; the get-surgery
  response carries the completeness / next-due data.
- **Web** — the scheme editor gets an `uncapped` / `capped` toggle with
  `count` + `period` (`every` + unit) inputs; the control form is driven
  by the chosen definition's CustomFields; the Surgery detail shows a
  "3 of 4 recorded · next due ~48 h" indicator per capped definition.

## Interaction with ADR 0027

A control definition's occurrence rule can only be changed while **no
`Control` on any Surgery references it** — once used it is frozen (ADR
0027). To change a capped control's `N` or `period` after it has been
used, add a **new** control definition and stop offering the old one; the
old one stays for its historical recordings.

## Not decided here

- The persistence shape of `definitionId` (FK vs. id-only).
- Whether completeness / next-due is stored or computed (leaning
  computed).
- Any reminder or notification when a scheduled timepoint passes —
  notifications are deferred (ADR 0008).
- A "deprecate / stop offering" flag for a control definition the
  physician no longer wants on new Surgeries — see ADR 0027's "Not
  decided here".
- Additional occurrence modes (e.g. "at least N", explicit per-timepoint
  offsets rather than a fixed period) — no evidence of need; revisit only
  on a real case.

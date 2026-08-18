# 0006 — Research study lifecycle: DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED

## Status

Established (current iteration). Supersedes the "same Procedure Type"
universe constraint from the original discovery draft (Amendment 1) and
the original hypothesis/conclusion-gated, universe-locking lifecycle
(Amendment 2) — see both below.

## Decision

A Research Study belongs exclusively to one Physician/Tenant and contains
only: `hypothesis`, `results`, `analysis`, `conclusion` (all free text),
and a universe of Surgeries selected by the Physician. That universe may
include Surgeries from multiple, different Patients and different
Procedure Types within the same tenant.

Lifecycle:

```
DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED
```

- **DRAFT** — may exist without any selected Surgery; the Physician may
  modify all text fields, add or remove Surgeries, and delete the study
  (deletion is only possible in this state).
- **IN_PROGRESS** — the Physician may modify all text fields, add
  Surgeries, and remove Surgeries. The Surgery universe is **not
  locked** in this state.
- **COMPLETED** — the study becomes **completely non-modifiable**: no
  text edits, no adding/removing Surgeries, no other changes. The
  Physician may transition a `COMPLETED` study back to `IN_PROGRESS`,
  at which point it becomes fully modifiable again. Completion is
  therefore reversible, not a final/locked state.

A Research Study may only be **deleted** while `DRAFT`.

Research data is fully private to the physician's tenant; a study can
only operate over surgeries and controls in that same tenant.

## Amendment 1

An earlier draft described the universe as "surgeries of the same
Procedure Type." That constraint is retired: the product owner confirmed
there is currently no such requirement.

## Amendment 2

The original lifecycle entered `IN_PROGRESS` via an explicit "confirm
hypothesis" action (requiring a non-empty hypothesis) and locked the
Surgery universe from that point on; it entered `COMPLETED` via a
"confirm conclusion" action (requiring a non-empty conclusion) while
leaving the study's text fields editable and the universe locked. That
model is retired in favor of the simpler rule above: transitions are
plain state changes (`DRAFT → IN_PROGRESS`, `IN_PROGRESS → COMPLETED`,
`COMPLETED → IN_PROGRESS`) gated only by current state and tenant
ownership — no content preconditions. The universe is never locked except
by `COMPLETED`, and `COMPLETED` itself is reversible.

## Rationale

It is the physician's own workspace and data. `COMPLETED` acting as a
full stop rather than a partial lock is simpler to reason about, and
making it reversible avoids introducing any notion of a permanently
"final" or "published" state — which remains explicitly out of scope.

## Not decided here

- Whether/when a locking, versioning, or audit mechanism for the entire
  study becomes necessary — explicitly deferred, not designed now.
- Any further structure within the free-text fields themselves.

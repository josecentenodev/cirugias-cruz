# 0006 — Research study lifecycle: DRAFT → IN_PROGRESS → COMPLETED

## Status
Established (current iteration). Supersedes the "same Procedure Type"
universe constraint from the original discovery draft — see Amendment
below.

## Decision
A Research Study belongs exclusively to one Physician/Tenant and contains
only: `hypothesis`, `results`, `analysis`, `conclusion` (all free text),
and a universe of Surgeries selected by the Physician. That universe may
include Surgeries from multiple, different Patients within the same
tenant, and is **not** required to share the same Procedure Type.

Lifecycle:

```
DRAFT → IN_PROGRESS → COMPLETED
```

- **DRAFT** — may exist without any selected Surgery; the Physician may
  add or remove Surgeries; the Physician may delete the study (deletion
  is only possible in this state).
- **IN_PROGRESS** — entered when the Physician confirms the hypothesis;
  the universe of Surgeries becomes **locked** (cannot be added to or
  removed from).
- **COMPLETED** — entered when the Physician confirms the conclusion; the
  universe remains locked. The study's text fields may still be modified
  by the Physician — completion does not make the study immutable.

The physician may modify the research's text fields as needed even after
`COMPLETED` — there is no immutable/final/locked state for the study as a
whole, no versioning, no publishing, and no audit trail in this
iteration. The Surgery *universe*, specifically, is locked from
`IN_PROGRESS` onward — that locking is now a confirmed rule, distinct
from the study's text fields remaining editable.

Research data is fully private to the physician's tenant; a study can
only operate over surgeries and controls in that same tenant.

## Amendment (this round)
An earlier draft described the universe as "surgeries of the same
Procedure Type." That constraint is retired: the product owner confirmed
there is currently no such requirement.

## Rationale
It is the physician's own workspace and data; the product does not
currently need to enforce finality or protect against edits to the text
fields after completion. Locking the Surgery universe once the hypothesis
is confirmed keeps the study's evidentiary basis stable during and after
analysis, without introducing full immutability. Introducing
locking/versioning/audit of the entire study now would be a speculative
technical decision without a stated need.

## Not decided here
- Whether/when a locking, versioning, or audit mechanism for the entire
  study becomes necessary — explicitly deferred, not designed now.
- Any further structure within the free-text fields themselves.

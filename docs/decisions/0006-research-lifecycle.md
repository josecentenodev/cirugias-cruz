# 0006 — Research study lifecycle: DRAFT → IN PROGRESS → COMPLETED

## Status
Established (current iteration).

## Decision
A Research Study has an explicit lifecycle:

```
DRAFT → IN PROGRESS → COMPLETED
```

- **DRAFT** — study created, hypothesis not yet confirmed.
- **IN PROGRESS** — physician confirms the hypothesis; the study becomes
  active and accumulates a universe of surgeries of the same Procedure
  Type, plus their associated controls/data.
- **COMPLETED** — physician confirms the conclusion.

A study conceptually contains: hypothesis, universe of surgeries,
controls/collected data, results, analysis, conclusion.

The physician may modify the research as needed, including after it
reaches `COMPLETED` — there is no immutable/final/locked state, no
versioning, no publishing, and no audit trail in this iteration.

Research data is fully private to the physician's tenant; a study can
only operate over surgeries and controls in that same tenant.

## Rationale
It is the physician's own workspace and data; the product does not
currently need to enforce finality or protect against edits after
completion. Introducing locking/versioning/audit now would be a
speculative technical decision without a stated need.

## Not decided here
- Whether/when a locking, versioning, or audit mechanism becomes
  necessary — explicitly deferred, not designed now.
- Internal structure of hypothesis/results/analysis/conclusion (free text
  vs. structured data).

# 0003 — Surgery simplified to a single DONE state, no scheduling

## Status
Established (current iteration). Deliberately temporary/pragmatic — see
"Temporary / evolving decisions" in [DOMAIN.md](../domain/DOMAIN.md#13-temporary--evolving-decisions).

## Decision
For this iteration, a surgery:
- belongs to a Patient
- has a Procedure Type
- has a performance/realization date
- has a single state: `DONE`
- has a `metadata` mechanism for information not yet part of the formal model

There is no surgery scheduling, calendar, pre-operative lifecycle, or
future/planned surgery state in this iteration.

## Rationale
Development focus is deliberately: completed surgery → postoperative
controls → collected data → research. Scheduling is a separate concern
that isn't needed to deliver that focus, and modeling it now would be
speculative.

## Not decided here
- Additional surgery-specific clinical fields (deferred to physician
  meeting).
- Whether/when additional surgery states will be introduced.

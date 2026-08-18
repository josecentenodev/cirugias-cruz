# 0003 — Surgery simplified to a single DONE state, no scheduling

## Status

Established (current iteration). Deliberately temporary/pragmatic — see
"Temporary / evolving decisions" in [DOMAIN.md](../domain/DOMAIN.md#13-temporary--evolving-decisions).

## Decision

For this iteration, a surgery:

- belongs to exactly one Patient
- has exactly one Procedure Type
- has a performance/realization date
- is currently always in state `DONE`
- may initially exist without Controls; is expected to eventually have
  multiple Controls, but the domain must not require one at creation time
- has a `metadata` mechanism for information not yet part of the formal
  model — intentionally unresolved

There is no surgery scheduling, calendar, pre-operative lifecycle, or
future/planned surgery state in this iteration.

**Modification and deletion:** only the Physician may modify or delete a
Surgery.

## Rationale

Development focus is deliberately: completed surgery → postoperative
controls → collected data → research. Scheduling is a separate concern
that isn't needed to deliver that focus, and modeling it now would be
speculative. Restricting modification/deletion to the Physician matches
their role as sole owner and controller of their tenant's data.

## Not decided here

- Additional surgery-specific clinical fields (deferred to physician
  meeting).
- Whether/when additional surgery states will be introduced.
- The final shape of Surgery `metadata`.

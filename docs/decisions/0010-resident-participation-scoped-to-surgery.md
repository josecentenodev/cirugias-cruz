# 0010 — Resident assignment is direct to the Surgery; no Resident ↔ Patient relationship

## Status
Established (current iteration). **Amends** the original version of this
ADR — see Amendment below.

## Decision
There is no Resident ↔ Patient relationship of any kind. A Resident is
never assigned to a Patient.

```
Physician
    │
    ├── Residents
    │
    └── Patients
           │
           └── Surgeries
                  │
                  └── Residents participating
                         │
                         └── Controls
```

- The Physician creates and manages Residents.
- The Physician creates Surgeries.
- The Physician assigns one or more Residents **directly to a Surgery**.
- From that assignment, the Resident participates in that Surgery, even
  before recording any Control.
- If the same Patient has another Surgery, the participating Residents
  for that Surgery are determined independently.
- A Resident may participate in multiple Surgeries.
- A Resident may participate in one Surgery of a Patient and not in
  another Surgery of that same Patient.

A Resident assigned to a Surgery who has not recorded any Control for it
may be removed from that Surgery. Once a Resident has recorded a Control
for a Surgery, their participation in that Surgery must be preserved and
cannot be removed.

## Amendment
The original version of this decision modeled Resident assignment at the
Patient level (Resident ↔ Patient), with clinical participation described
as a separate, Surgery-scoped fact layered on top of that assignment.
The product owner has now eliminated the Resident ↔ Patient relationship
entirely: assignment and participation are the same act, and both happen
directly at the Surgery level. This is a cleaner model of the same
underlying rule — the resident's unit of clinical responsibility was
always the Surgery, not the Patient — and it removed the need for a
separate cross-aggregate check to preserve participation when
"unassigning" a resident, since removal is now a Surgery-local operation.

## Rationale
The product owner considers Surgery-scoped participation clinically
relevant, not merely a technical immutability concern: the resident may
carry professional/civil responsibility for their participation in that
particular surgery, so the historical record of "who participated in
which surgery" must be accurate and permanent. Modeling assignment
directly on Surgery (rather than via an intermediate Patient-level
assignment) reflects that this responsibility was never about the
Patient relationship at all.

## Not decided here
- The exact technical representation/enforcement of the
  participation-preservation rule beyond "cannot be removed once a
  Control was recorded" (deferred — see [DOMAIN.md §16](../domain/DOMAIN.md#16-open-business-questions)).
- Any additional resident permission or workflow rules beyond Surgery
  assignment and this participation rule.

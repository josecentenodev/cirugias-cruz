# 0007 — Residents are optional; immutable once they have participated

## Status

Established (current iteration).

## Decision

Residents are optional. A physician may have zero or more residents and
may act as their own resident. Residents are assigned to patients (not
directly to individual surgeries — the exact scope of a resident's
participation across a patient's surgeries remains open). A patient may
have one or more residents assigned.

Once a resident has participated in a Control, or recorded information
related to the controls of a surgery, that resident cannot be removed
from that relevant context.

## Rationale

Historical clinical participation must be preserved for accuracy and
accountability, even if the physician later wants to remove a resident
from ongoing work.

## Not decided here

- Whether resident participation should be scoped per-surgery rather than
  per-patient.
- Any additional resident permission or workflow rules beyond assignment
  and the immutability rule above.

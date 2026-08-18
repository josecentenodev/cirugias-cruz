# 0004 — Control as the domain concept; Follow-up is not an entity

## Status
Established (current iteration).

## Decision
"Follow-up" is not modeled as a domain entity. It is the process of
accumulating **Controls** over time for a surgery.

A Control belongs to exactly one Surgery, has `observations` and a
mandatory date/time, and records who performed it — either the Physician
directly, or a Resident who is participating in that specific Surgery
([0010](0010-resident-participation-scoped-to-surgery.md)). It is created
manually whenever the performer chooses. There is no automated control
scheduling, no requirement to auto-generate controls, and no enforced
control frequency in this iteration — timing is determined by the
physician per patient.

A Control may contain multiple CustomFields/measurements
([0005](0005-customfields.md)); each CustomField can be recorded only
once within a given Control. The exact pterygium measurements are not yet
known.

**Modification and deletion:** only the Physician may modify or delete a
Control, regardless of who originally performed it.

## Rationale
The vocabulary term "Seguimiento" describes a process, not a discrete
record with its own identity and lifecycle. Forcing it into an entity
would misrepresent the domain. The actual recorded thing is the Control.
Manual, unscheduled creation matches the current lack of clinical
knowledge about correct control frequency, which varies per patient and
is not yet known for pterygium. Restricting modification/deletion to the
Physician, even when a resident performed the control, matches the
Physician's role as the sole controller of their tenant's clinical
record.

## Not decided here
- Exact Control fields/structure beyond "observations + mandatory
  datetime + author + CustomFields" (deferred to physician meeting).
- Future procedure-specific or predefined control schedules — explicitly
  deferred, not designed now.
- CustomField value model itself remains unresolved
  ([0005](0005-customfields.md)).

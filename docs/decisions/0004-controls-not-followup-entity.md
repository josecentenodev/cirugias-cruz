# 0004 — Control as the domain concept; Follow-up is not an entity

## Status
Established (current iteration).

## Decision
"Follow-up" is not modeled as a domain entity. It is the process of
accumulating **Controls** over time for a surgery.

A Control is a manually created record of an observation/measurement at a
point in time, with free-text interpretation, created by the physician
whenever they choose. There is no automated control scheduling, no
requirement to auto-generate controls, and no enforced control frequency
in this iteration — timing is determined by the physician per patient.

Controls support configurable/custom information via the CustomField
mechanism ([0005](0005-customfields.md)) because the exact pterygium
measurements are not yet known.

## Rationale
The vocabulary term "Seguimiento" describes a process, not a discrete
record with its own identity and lifecycle. Forcing it into an entity
would misrepresent the domain. The actual recorded thing is the Control.
Manual, unscheduled creation matches the current lack of clinical
knowledge about correct control frequency, which varies per patient and
is not yet known for pterygium.

## Not decided here
- Exact Control fields/structure beyond "measurement + free-text
  interpretation + CustomFields" (deferred to physician meeting).
- Future procedure-specific or predefined control schedules — explicitly
  deferred, not designed now.

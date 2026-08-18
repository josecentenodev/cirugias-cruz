# 0005 — Controlled extensibility via CustomFields

## Status
Established (current iteration). Deliberately temporary/pragmatic — see
"Temporary / evolving decisions" in [DOMAIN.md](../domain/DOMAIN.md#13-temporary--evolving-decisions).

## Decision
The platform supports controlled extensibility, not an arbitrary
form-builder. The platform owns the core domain concepts (Patient,
Surgery, Control, Procedure Type, Research); within those concepts, the
physician can define the custom information they need via CustomFields.

CustomField structure:
- `name` — required
- `description` — optional
- `unit` — required
- `magnitude` — required

CustomFields can extend Procedure Types, Surgeries, Controls, and other
predefined clinical concepts where appropriate.

Procedure Types themselves are also physician-customizable (not a fixed
enum); pterygium is the first one.

## Rationale
The exact clinical measurements needed for pterygium (and future
procedures) are not yet known and will come from a physician meeting.
CustomFields let development and real usage proceed now without inventing
clinical fields, while keeping customization bounded to specific,
platform-owned concepts rather than becoming a generic schema builder.

A Control may contain multiple CustomFields; each CustomField can be
recorded only once within a given Control
([0004](0004-controls-not-followup-entity.md)).

## Not decided here — explicitly out of implementation scope
- Exact value representation of a CustomField (how a recorded value is
  stored/typed).
- The relationship between `magnitude` and `unit`.
- Exact value types allowed.
- How CustomField *definitions* are associated with Procedure Types,
  Surgeries, and Controls (i.e. definition vs. fill-in).
- Whether this CustomField structure is final — it is explicitly expected
  to evolve as clinical knowledge is gathered.

None of the above should be implemented until explicitly resolved.

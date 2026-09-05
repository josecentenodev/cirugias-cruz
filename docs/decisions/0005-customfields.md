# 0005 — Controlled extensibility via CustomFields

## Status

Established (current iteration). Deliberately temporary/pragmatic — see
"Temporary / evolving decisions" in [DOMAIN.md](../domain/DOMAIN.md#13-temporary--evolving-decisions).
**Partially amended** by [0018](0018-customfield-value-representation.md),
which resolves value representation, per-type constraints, scope, and
aggregate placement, and by
[0020](0020-customfield-unit-is-numeric-only-no-magnitude.md), which
removes `magnitude` and makes `unit` an optional part of the `NUMBER`
constraint (closing the "relationship between `magnitude` and `unit`"
point below) — see those ADRs before treating the "Not decided here" list
below as still fully open.

## Decision

The platform supports controlled extensibility, not an arbitrary
form-builder. The platform owns the core domain concepts (Patient,
Surgery, Control, Procedure Type, Research); within those concepts, the
physician can define the custom information they need via CustomFields.

CustomField structure (as originally decided — see ADRs 0018 and 0020 for
the current shape):

- `name` — required
- `description` — optional
- `unit` — required _(now optional and `NUMBER`-only, per ADR 0020)_
- `magnitude` — required _(removed entirely by ADR 0020)_

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
- The relationship between `magnitude` and `unit`. _(Resolved by ADR
  0020: `magnitude` removed; `unit` is optional `NUMBER`-only metadata.)_
- Exact value types allowed.
- How CustomField _definitions_ are associated with Procedure Types,
  Surgeries, and Controls (i.e. definition vs. fill-in).
- Whether this CustomField structure is final — it is explicitly expected
  to evolve as clinical knowledge is gathered.

None of the above should be implemented until explicitly resolved.

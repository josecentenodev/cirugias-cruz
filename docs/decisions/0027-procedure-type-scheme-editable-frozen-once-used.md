# 0027 — Procedure Type schemes are editable, but a definition freezes once it has data

## Status

Established (current iteration). **Amends** [0011](0011-procedure-type-ownership-and-no-deletion.md)
(ProcedureType ownership / no-deletion) and closes the mutability open
point in [0018](0018-customfield-value-representation.md)'s "Not decided
here" ("mandatory `CONTROL`-scoped fields, cross-field validation" and,
implicitly, whether definitions can be edited at all). Companion to
[0026](0026-control-types-cap-and-measurement-period.md). Comes out of the
2026-09-09 product-owner session
([`../architecture/alignment-restructuring.md`](../architecture/alignment-restructuring.md)
§A3, walkthrough finding **F-09**).

## Context

A `ProcedureType`'s scheme — its CustomField definitions and (ADR 0026)
its control definitions — is effectively **add-only** today: `web`
exposes only an "add CustomField" action, and only the ProcedureType's
`name` / `description` can be edited. The product owner needs to maintain
the scheme over time:

> "Se tienen que poder editar los esquemas de controles."

...but also holds accidental data loss as "un eje fundamental de UX" —
changing a scheme that already has recorded data against it must not
silently corrupt or orphan that data.

## Decision

### The scheme becomes editable

A `ProcedureType`'s CustomField definitions and control definitions can be
**added, edited, and removed** — not just added. Editing the
ProcedureType's own `name` / `description` stays allowed (unchanged).
ProcedureType itself is still **never deleted** (ADR 0011, untouched) —
this ADR only adds mutation *within* a ProcedureType's scheme.

### Freeze rule — no modification once data exists

**A scheme element cannot be modified or removed once data has been
recorded against it** (product owner, 2026-09-09):

- A **CustomField definition** is *frozen* as soon as any `Surgery` or
  `Control` holds a value for it.
- A **control definition** is *frozen* as soon as any `Control` on any
  `Surgery` references it.
- *Frozen* means: **no edit, no remove.** It stays exactly as it is, for
  the historical data that depends on it.
- **Adding** new definitions is always allowed.
- **Editing / removing** a definition that has **no** recorded data is
  allowed.

The rule is **all-or-nothing per definition** — not "you may edit the
label but not the `valueType`". It is simpler to reason about, and it
matches the physician's "a conciencia" stance: to change a scheme element
that already has data, you add a **new** definition and stop offering the
old one. The old one remains for its historical values/recordings.

### Where it is enforced

In the **Application layer**, not as an entity invariant — a
`ProcedureType` cannot see the Surgeries and Controls that reference its
definitions, so it cannot self-check this. Same shape as ADR 0021's
per-tenant `dni` uniqueness and `validateCustomFieldValues`
(`packages/application/src/shared/`): the edit/remove operation asks the
`SurgeryRepository` whether any value/recording exists for the target
definition, and rejects with a `DomainError` ("this field/control has
recorded data and can no longer be changed") surfaced as a 400 shown
inline. The domain mutators on `ProcedureType` assume the caller has
already cleared the check.

## Consequences

- **Domain** — `ProcedureType` gains `editCustomField` / `removeCustomField`
  / `editControlDefinition` / `removeControlDefinition` mutators (names
  indicative), each pure and each assuming "no data" was verified
  upstream.
- **Application** — matching operations that run the freeze check against
  the `SurgeryRepository` before delegating; a repository method to
  answer "does any value/recording reference definition X across this
  physician's Surgeries".
- **HTTP** — `PATCH` / `DELETE` routes for a ProcedureType's individual
  definitions.
- **Web** — the scheme editor gains edit + remove affordances, each
  **disabled with an explanation** when the definition is frozen
  ("recorded data exists — add a new field instead"). Removing an
  *unused* definition still goes through the deliberate-confirmation
  pattern (alignment doc §B3).

### Consequence for ADR 0026

This answers ADR 0026's open question "editing the cap after recordings
exist": you cannot — a control definition freezes the moment the first
`Control` references it. Changing a capped control's `N` or `period` after
use means adding a new control definition.

## Not decided here

- A **"deprecate / stop offering"** flag for a frozen definition the
  physician no longer wants presented on new Surgeries (it would vanish
  from forms while keeping historical data). Plausible fast follow; not
  required now.
- **Versioned** scheme history (keeping every past shape of a
  definition). Out of scope — the freeze rule makes it unnecessary for
  correctness.
- Whether a bulk "edit the whole scheme" transaction is offered vs.
  one definition at a time — implementation/UX detail.
- Relaxing the all-or-nothing rule to allow safe partial edits (e.g.
  renaming a frozen field's label) — revisit only if the physician asks.

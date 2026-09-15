# 0030 — Every Control has a type; ad-hoc (typeless) controls are removed

## Status

Established (current iteration). **Amends [0026](0026-control-types-cap-and-measurement-period.md)**
— reverses its "Ad-hoc controls stay valid" section specifically. Every
other part of 0026 (the `ControlDefinition` concept living in the
`ProcedureType` scheme, the `uncapped`/`capped` occurrence rule, the `≤ N`
cap invariant, the per-Surgery completeness/next-due projection) is
unamended and current. Also touches
[registerProcedureType](../architecture/ROADMAP.md) (Milestone 1) and
interacts with [0027](0027-procedure-type-scheme-editable-frozen-once-used.md)
(a definition freezes once a Control references it).

## Decision

1. **`Control.definitionId` becomes required.** A `Control` cannot exist
   without a `ControlDefinition` — recording one without picking a type
   is no longer possible, at any layer (Domain, Application, HTTP, web).
2. **`registerProcedureType` automatically creates one default
   `ControlDefinition`** as part of creating the `ProcedureType` —
   `uncapped`, a generic non-clinical name (e.g. "General"), no
   `CONTROL`-scoped CustomFields. This is a **structural** default, not
   clinical content: it names no pterygium-specific (or any specialty's)
   concept, the same way an empty list or a `DRAFT` status is a
   structural default elsewhere in this product. A `ProcedureType` is
   therefore never left without at least one usable control type — the
   gap `registerProcedureType` alone would otherwise leave (nothing
   requires a physician to remember to add a control definition before
   their first Surgery under that type).
3. **The physician can rename, retype (uncapped ⇄ capped), or delete this
   default definition** like any other, subject to 0027's existing rule
   (editable/deletable only while no Control references it yet — once
   used, frozen). Nothing about it is special or protected; it is a
   normal `ControlDefinition` row that happens to be the first one.
4. **The web "Tipo de control: Ninguno" option is removed.** The
   record-Control form always requires picking a definition; when a
   `ProcedureType` has exactly one (the common case right after creation
   or for a physician who never bothered adding more), the form
   pre-selects it rather than making the physician pick from a
   one-item list.

## Rationale

0026 kept ad-hoc controls valid to avoid regressing existing usage the
day capped/typed controls shipped. In practice this made "control type"
read as an optional, secondary concept the physician could take or leave
— exactly backwards from what it actually is: **the type is the shape of
the thing being recorded** (which CustomFields apply, whether it's
capped, what the cap means). Two controls of the same "type" with and
without a type selected looked like the same feature offering two
different mental models for the same action, which is what made it
confusing rather than flexible. Making every Control require a type,
and guaranteeing a type always exists via the seeded default, removes
the fork without losing the "I don't need anything fancy" case — an
uncapped, no-fields default definition **is** exactly that case, just
named and selectable like everything else instead of being a hidden
"none" branch.

## Scope of this decision

- **Domain**: `Surgery.recordControl` requires `definitionId`
  (`string`, not `string | undefined`); the Domain-level "must reference
  an existing definition on this Surgery's ProcedureType" check
  (already present for a supplied `definitionId`) becomes unconditional
  rather than conditional on one being supplied.
- **Application**: `registerProcedureType` gains a
  `ControlDefinitionRepository`-shaped write (or, since control
  definitions persist inside the `ProcedureType` aggregate per 0026/0019,
  simply constructs the `ProcedureType` with one seeded
  `ControlDefinition` before the first `save()` — an implementation
  detail, not fixed here) so the default exists atomically with the
  `ProcedureType` itself, never as a second, separately-failable step.
  `recordControl`/`modifyControl` stop treating `definitionId` as
  optional input.
- **Infrastructure**: `controls.definitionId` becomes `NOT NULL`. Since
  the only existing ad-hoc (`definitionId IS NULL`) rows are pre-MVP
  test/demo data — **confirmed by the product owner, not real clinical
  data** — the migration deletes those rows rather than backfilling them
  into a synthetic definition; no data-preservation step is needed.
- **HTTP**: `POST /surgeries/:id/controls`'s `definitionId` moves from
  optional to required in the request schema (structural validation);
  `GET /procedure-types` / the create-Procedure-Type response include the
  seeded definition like any other.
- **Web**: `RecordControlForm` drops the "None" option entirely — the
  select always starts populated and, in the single-definition case,
  pre-selected; no behavior for "record without a type" remains reachable
  from the UI. The Procedure Type scheme editor needs no new UI —
  `ControlDefinitionForm`/`ControlDefinitionList` already handle
  create/edit/remove of the (now-guaranteed-to-exist) default like any
  other definition.

## Not decided here

- The exact default name/label for the seeded definition (e.g.
  "General" vs "Control general" vs something else) — a copy choice for
  implementation, not an architectural one.
- Whether a physician who deletes the default (once no longer the only
  one, or before ever using it) should be re-offered a way to regenerate
  it — not requested; `ControlDefinition`'s existing add-definition flow
  already covers "I want another one."
- Any change to `CONTROL`-scoped CustomFields, the cap invariant, or the
  completeness/next-due projection — all unaffected, this ADR only
  removes the "no type" branch and guarantees a type always exists.

## Not implemented by this ADR

Recording the decision only. Implementation touches Domain
(`Surgery.recordControl`'s `definitionId` becomes required),
Application (`registerProcedureType` seeds the default definition;
`recordControl` stops accepting a missing `definitionId`), Infrastructure
(`controls.definitionId NOT NULL` migration, deleting the pre-existing
ad-hoc rows), HTTP (schema validation), and `web` (`RecordControlForm`
drops "None").

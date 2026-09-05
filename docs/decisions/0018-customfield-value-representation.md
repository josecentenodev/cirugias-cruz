# 0018 — CustomField gains a value type, per-type constraints, and a scope; lives inside ProcedureType

## Status

Established (current iteration). **Amends** [0005](0005-customfields.md), resolving
several of the points that ADR explicitly left open ("Not decided here").
**Partially amended by [0020](0020-customfield-unit-is-numeric-only-no-magnitude.md)**:
`magnitude` has since been removed entirely, and `unit` moved into the
`NUMBER` constraint as an optional field — read the `unit`/`magnitude`
bullets below in that light.
Motivated by a domain-modeling conversation triggered by reviewing a
working prototype built independently by the physician who is the source
of clinical requirements for this project — see
[`physician-prototype-analysis.md`](../domain/physician-prototype-analysis.md)
for the full analysis of that prototype.

## Decision

`CustomField` is not replaced or split into a parallel concept. It is the
same entity from ADR 0005, completed with the pieces that were previously
deferred:

- `name` — required (unchanged)
- `description` — optional (unchanged)
- `unit` — the human-readable unit of measurement (e.g. "escala 0-10",
  "mmHg"). **Superseded by [0020](0020-customfield-unit-is-numeric-only-no-magnitude.md)**:
  now optional and carried inside the `NUMBER` constraint only.
- `magnitude` — the clinical dimension being measured (e.g. "dolor",
  "presión intraocular"). **Removed by
  [0020](0020-customfield-unit-is-numeric-only-no-magnitude.md)** as
  redundant with `name`.
- `valueType` — **new**, one of `NUMBER | ENUM | TEXT | DATE`
- a **constraint**, whose shape depends on `valueType` and which only that
  type may carry:
  - `NUMBER` → optional `unit` (per 0020) + optional `min` / `max`
  - `ENUM` → a list of allowed options (minimum 1)
  - `TEXT` → optional `maxLength`
  - `DATE` → optional `min` / `max` date bounds

### Where `CustomField` lives: inside the `ProcedureType` aggregate

`CustomFieldDefinition`s are not their own aggregate with their own
repository. They live as internal entities of `ProcedureType`, the same
way `Control` lives as an internal entity of `Surgery` (ADR 0004): no
`CustomFieldRepository` should exist. This is a direct application of the
same reasoning already used for Control — the invariant "a field name
must be unique within a given ProcedureType" cannot be enforced correctly
if definitions are loaded/saved independently of the ProcedureType they
belong to, so they must be inside the same consistency boundary.

Recorded **values** (an actual `{ definitionId, value }` pair a physician
or resident fills in) are not their own entity or aggregate either. They
are embedded, depending on the field's `scope` (below), inside `Surgery`
or inside the `Control` that carries them — both already inside the
`Surgery` aggregate, so nothing new is introduced at that level.

### Scope: Surgery-level vs. Control-level

`CustomField` also carries a `scope`: `SURGERY` (the value is fixed once,
at the level of the Surgery itself — e.g. surgical technique used) or
`CONTROL` (the value is recorded repeatedly, once per Control, over time
— e.g. a pain scale measured at successive follow-ups). This distinction
is not speculative: it is the exact shape of two real cases found in the
physician's own prototype (surgical technique recorded once per case vs.
a 0–10 pain scale recorded at day 1 / day 3 / day 7 follow-ups).

### The one new invariant this introduces

A `CustomField`'s constraint must be coherent with its declared
`valueType` — e.g. a `TEXT` field must never carry a numeric `min`/`max`,
an `ENUM` field must always carry at least one option. This is enforced
by `CustomField`'s own constructor/factory, so nothing that reads a
`CustomField` needs to re-validate that coherence itself.

`CustomField` options for an `ENUM` field may be added to over time, but
never removed — the same "never deleted, only extended" spirit already
established for `ProcedureType` itself (ADR 0011), for the same reason:
historical values recorded against an option must remain valid and
meaningful even after the physician's working vocabulary evolves.

## Rationale

This was prompted by reviewing a prototype the physician had already
built for themself (see the linked analysis document) to track pterygium
recidivism and post-surgical pain by treatment arm. That prototype's own
structure — a closed list of surgical techniques recorded once per case,
and a numeric pain scale recorded at fixed follow-up days, each compared
in an aggregated table by subgroup — is what surfaced the concrete shape
`CustomField`'s value model needed: without a `valueType`, aggregate
statistics (recurrence rate by technique, mean pain score by treatment
arm) cannot be computed with any guarantee, since the platform would have
no way to know a value is numeric versus free text. A fully untyped
key-value ("EAV") model was considered and rejected for this reason: it
maximizes flexibility but forecloses exactly the aggregated,
research-grade statistics this platform exists to provide (see the
ResearchStudy rationale in [DOMAIN.md](../domain/DOMAIN.md) and ADR 0006).

Keeping `CustomField` inside `ProcedureType` (rather than promoting it to
its own aggregate) is a direct, symmetric application of the reasoning
already used for `Control` inside `Surgery` in ADR 0004 — the same "no
new repository, embed inside the aggregate that owns the invariant"
pattern, applied consistently rather than re-litigated from scratch.

The explicit goal behind this decision, stated by the product owner: the
platform should not hard-code any specialty-specific clinical concept
(pterygium-specific or otherwise). `CustomField` with an explicit
`valueType`, constraint, and scope is the generic mechanism that lets any
physician, in any surgical specialty, define their entire working
data schema themselves — pterygium is the first Procedure Type built,
not a ceiling on what the platform can represent.

## Not decided here — still explicitly out of implementation scope

- The exact technical/persistence representation was an open
  Infrastructure-layer question at the time of this ADR — now resolved
  by [0019](0019-customfield-persistence-schema.md) (normalized SQL
  tables, not a JSON column).
- Any additional `valueType` beyond `NUMBER | ENUM | TEXT | DATE` (e.g.
  boolean, multi-select, file attachment) — only add one when a real,
  documented case needs it, the same way these four came from two
  concrete cases already observed rather than being invented speculatively.
- Whether a `CONTROL`-scoped `CustomField` can be made mandatory on every
  Control of a given Surgery, or optional-by-default — not addressed by
  this ADR.
- Whether `CustomField` should support cross-field validation (e.g. "day
  3 pain score must be recorded before day 7") — not addressed; no
  evidence for this requirement yet.

None of the above should be implemented until explicitly resolved.

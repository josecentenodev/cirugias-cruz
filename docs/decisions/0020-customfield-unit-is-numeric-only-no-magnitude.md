# 0020 — CustomField `unit` belongs to a NUMBER field only; `magnitude` is removed

## Status

Established (current iteration). **Amends** [0018](0018-customfield-value-representation.md)
and, transitively, [0005](0005-customfields.md) — it closes 0005's open
point "The relationship between `magnitude` and `unit`" by removing
`magnitude` outright. It also adjusts the persistence shape decided in
[0019](0019-customfield-persistence-schema.md).

Motivated by manual testing of the working Configuración → Procedure Type
→ CustomField screen (Milestone 8.6): parametrizing an `ENUM` field
(surgical technique) still forced the physician to type a "unit" and a
"magnitude", neither of which means anything for a fixed-option field.

## Context

ADR 0018 completed `CustomField` with a `valueType` (`NUMBER | ENUM |
TEXT | DATE`) and a **per-type constraint "whose shape depends on
`valueType` and which only that type may carry"**. But it left `unit` and
`magnitude` exactly as 0005 had them: **required, at the top level, for
every field regardless of `valueType`**. That is inconsistent with 0018's
own principle, and it surfaced as real data-entry friction:

- A `unit` of measurement only has meaning for a **numeric** value
  ("mmHg", "escala 0-10"). An `ENUM` (técnica quirúrgica), a `TEXT` note,
  or a `DATE` has no unit.
- `magnitude` ("the clinical dimension being measured", e.g. "dolor",
  "presión intraocular") is **redundant with `name`**. A field named
  "Dolor (EVA)" or "Presión intraocular" already states its dimension.
  Nothing in the platform consumes `magnitude` — the aggregate statistics
  0018 exists to enable are keyed off `valueType`, not off a free-text
  magnitude string.

## Decision

1. **`magnitude` is removed** from `CustomField` entirely — no attribute,
   no column, no wire field. A field's clinical dimension is expressed by
   its `name`.

2. **`unit` moves into the `NUMBER` constraint** and becomes **optional**:

   ```
   NUMBER → { valueType: "NUMBER"; unit?: string; min?: number; max?: number }
   ENUM   → { valueType: "ENUM"; options: string[] }
   TEXT   → { valueType: "TEXT"; maxLength?: number }
   DATE   → { valueType: "DATE"; min?: Date; max?: Date }
   ```

   Only a `NUMBER` field can carry a `unit`; the other three types have
   no unit concept at all. `CustomField` exposes a convenience
   `unit: string | undefined` getter that reads it from the constraint.

3. This does **not** reopen anything else about `CustomField`: it stays
   an internal entity of `ProcedureType` (no `CustomFieldRepository`),
   recorded values stay embedded in `Surgery`/`Control` per `scope`, and
   the `valueType`/constraint-coherence invariant enforced by
   `CustomField.create()` is unchanged.

### Persistence impact (amends 0019)

`custom_field_definitions.unit` becomes **nullable** and is populated
**only for `NUMBER` definitions** (written/read by the mapper as part of
the NUMBER constraint, alongside `constraintMin`/`constraintMax`). The
`magnitude` column is **dropped**. Migration
`20260905120000_customfield_unit_numeric_only_drop_magnitude` nulls
`unit` on every non-NUMBER row and drops `magnitude`.

## Rationale

This is 0018's own "a constraint only the owning `valueType` may carry"
rule, applied consistently instead of half-applied. `unit` is numeric
metadata, so it lives with the other numeric metadata. Dropping
`magnitude` removes a required field that duplicated `name` and that no
read model, statistic, or validation ever used — the kind of "a field per
concept" over-modeling the project's own guidance warns against.

The two concrete cases from
[`physician-prototype-analysis.md`](../domain/physician-prototype-analysis.md)
still fit cleanly: surgical technique is an `ENUM` with no unit; EVA is a
`NUMBER` with `unit: "0-10"`.

## Not decided here

- Everything 0018 already deferred (additional `valueType`s, mandatory
  vs. optional CONTROL-scoped fields, cross-field validation) stays
  deferred.
- Whether a physician can rename/re-unit an existing definition after
  values have been recorded against it — not addressed; no evidence for
  the requirement yet.

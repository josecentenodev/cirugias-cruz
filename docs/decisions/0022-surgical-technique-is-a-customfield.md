# 0022 — Surgical technique is a CustomField, not a ProcedureType attribute

## Status

Established (current iteration). **Amends** [0011](0011-procedure-type-ownership-and-no-deletion.md)
and closes the "exact final Procedure Type model — whether technique is a
fixed list, an open catalog, or a CustomField-driven concept" open point
in [`DOMAIN.md`](../domain/DOMAIN.md) §8 / §16 and ADR 0011's own "Not
decided here". Builds directly on [ADR 0018](0018-customfield-value-representation.md),
whose canonical example of a `SURGERY`-scoped `ENUM` CustomField is
"surgical technique used".

## Context

`ProcedureType` carried a free-text `technique` attribute. Reviewing the
physician's own prototype (`physician-prototype-analysis.md` §2.1)
surfaced two problems:

- Technique there is a **closed `<select>`** — "Autoinjerto conjuntival",
  "Autoinjerto conjuntival + MMC", "Membrana amniótica", "Autoinjerto +
  pegamento de fibrina", "Otra" — not free text.
- A technique is a property of an **individual Surgery**, not of the
  procedure-type definition. On the old model every Surgery of a given
  Procedure Type shared the one `technique` string — recording a
  different technique per case would have meant duplicating the Procedure
  Type.

## Decision

- **`ProcedureType.technique` is removed** entirely — the attribute, its
  getter, its handling in `create` / `reconstitute` / `modify`, the
  Prisma column, the wire field, and the `web` form field / list column.
  ProcedureType structure is now `name` + `description` only.
- Surgical technique is modelled as a **`SURGERY`-scoped `ENUM`
  CustomField** (ADR 0018) — exactly the mechanism already built in
  Milestone 8.6. The physician defines a "Técnica" ENUM on their
  "Pterigión" Procedure Type with their own option list; each Surgery
  picks one at registration.
- **Combined techniques** ("Autoinjerto + MMC", "Autoinjerto + pegamento
  de fibrina") are **explicit options** in that list — as in the
  prototype. No multi-select `valueType` is introduced; ADR 0018 defers
  additional value types until a real case needs one, and this is not
  one.
- The pterygium technique option list stays **physician-entered
  content**, not seeded in code — same posture as every other CustomField
  and consistent with ADR 0011 / DOMAIN.md (no specialty-specific
  clinical content in the platform).

## Consequences

- Removed across every layer (Domain → Application → Infrastructure →
  HTTP → `web`), same shape as the [ADR 0020](0020-customfield-unit-is-numeric-only-no-magnitude.md)
  `magnitude` removal. Migration
  `20260906130000_drop_procedure_type_technique` drops the column
  (applied to the Railway Postgres).
- `ProcedureType.modify` and `modifyProcedureType` now take
  `name` / `description` only.
- Aggregate statistics over technique ("recidiva por técnica") become
  computable — the value now has a known `valueType` (ADR 0019), which a
  free-text column never guaranteed.

## Not decided here

- Whether a `CONTROL`-scoped or otherwise mandatory technique field is
  ever needed — no evidence; ADR 0018's deferrals stand.
- Any migration of pre-existing `technique` values into CustomField
  values — there is no production data yet (Milestone 9's walkthrough has
  not happened), so the column is simply dropped.

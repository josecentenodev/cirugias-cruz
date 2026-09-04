# 0019 — CustomField persistence: normalized SQL tables, not a JSON column

## Status

Established (current iteration). Resolves the persistence-representation
point that [0018](0018-customfield-value-representation.md) explicitly
left open ("The exact persistence/technical representation of a recorded
value — Infrastructure-layer concern"). This is an Infrastructure-layer
decision; it does not change anything in `packages/domain` decided by
0018 — `CustomField` definitions and recorded values remain internal to
the `ProcedureType`/`Surgery` aggregates from the Domain's point of view.
Not yet implemented.

## Decision

`CustomField` definitions and recorded values are persisted as normalized
relational tables in Postgres, not as a `jsonb` column on
`surgeries`/`controls`.

```
custom_field_definitions
  id, procedure_type_id (FK), name, description, unit, magnitude,
  value_type, scope, constraint_min, constraint_max,
  constraint_max_length, enum_options (jsonb list)

custom_field_values
  id, definition_id (FK), surgery_id (FK, nullable),
  control_id (FK, nullable),
  value_number, value_text, value_date, value_enum_option
  -- exactly one of the four value_* columns is populated per row,
  -- selected by the value_type of the referenced definition
```

`enum_options` on the definition stays as `jsonb` deliberately — it is
part of the _definition_ (a small, physician-edited list), not of a
_value_, and nothing needs to aggregate or filter across it at the SQL
level the way it needs to over recorded values.

Both tables are written and read only through `SurgeryRepository` /
`ProcedureTypeRepository` (or their infrastructure implementations) — no
`CustomFieldRepository` is introduced, consistent with 0018's placement
of `CustomField` inside the `ProcedureType`/`Surgery` aggregates rather
than as its own aggregate.

## Rationale

The two options considered were a single `jsonb` column embedding
recorded values directly on `surgeries`/`controls` rows, versus this
normalized schema. JSON wins on flexibility (no migration when a
physician edits their field definitions) and on load simplicity (the
whole aggregate arrives in one row read, matching how `SurgeryRepository`
already loads Surgery + Controls + participants in one unit). But it
loses on exactly the property this platform is meant to sell: computing
real aggregate statistics (recurrence rate by surgical technique, mean
pain score by treatment arm, per §4 of
[`physician-prototype-analysis.md`](../domain/physician-prototype-analysis.md))
requires either unnesting JSON with no real column types and no indexes,
or maintaining a second denormalized representation just for reporting.

The normalized schema keeps that computation as plain SQL
(`AVG(value_number) ... GROUP BY value_enum_option`), which is what the
future Read/Query side (already MVP-required — see
[`ROADMAP.md`](../architecture/ROADMAP.md)) and any live aggregated-stats
view (the open product-design idea from §4 of the prototype analysis)
will need directly. Definitions stay flexible (adding a new
`CustomField` to a `ProcedureType` is a row insert, not a schema
migration) while values stay queryable — the flexibility concern JSON
would have solved only really applies to the definitions side, which
this schema already handles without JSON.

The typed-columns table (`value_number`/`value_text`/`value_date`/
`value_enum_option`, only one populated per row) was chosen over a
single untyped `value_text` column for the same reason 0018 introduced
`valueType` in the first place: an untyped value column reintroduces the
"is this numeric or free text" ambiguity that made a fully generic
EAV model unacceptable for computing statistics.

## Known limitations, accepted for now

- The database cannot fully enforce, on its own, that the populated
  `value_*` column matches the referenced definition's `value_type` — a
  `CHECK` constraint can enforce "exactly one of the four columns is
  non-null," but matching _which_ one against `value_type` requires
  either a trigger or trusting the single write path
  (`packages/infrastructure`, the only code allowed to write these
  tables). No trigger is introduced now; this is accepted the same way
  other coherence rules in this codebase are enforced in the write path
  rather than the schema.
- Loading a `Surgery`/`ProcedureType` aggregate now involves a join
  (or a follow-up query) against `custom_field_values`/
  `custom_field_definitions` in addition to the tables already read.
  Given the expected number of CustomFields per Surgery/Control is small
  (a handful, not hundreds), this cost is not expected to be material —
  revisit only if real usage shows otherwise.

## Not decided here

- The exact Prisma schema/migration (column types, index choices) —
  implementation detail for whoever builds this in
  `packages/infrastructure`.
- Whether `custom_field_values` needs a uniqueness constraint beyond
  "one value per (definition_id, surgery_id)" / "one value per
  (definition_id, control_id)" — deferred until implementation.
- Anything already deferred by 0018 (additional `valueType`s, mandatory
  vs. optional CONTROL-scoped fields, cross-field validation).

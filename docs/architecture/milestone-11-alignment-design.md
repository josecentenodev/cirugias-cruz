# Milestone 11 — Post-walkthrough alignment: design

> Turns the 2026-09-09 product-owner walkthrough conclusions
> (`alignment-restructuring.md`, findings **F-01…F-09**) and the three
> ADRs they produced — [0025](../decisions/0025-patient-carries-no-contact-pii.md)
> (Patient carries no contact PII),
> [0026](../decisions/0026-control-types-cap-and-measurement-period.md)
> (control definitions with an optional cap + measurement period),
> [0027](../decisions/0027-procedure-type-scheme-editable-frozen-once-used.md)
> (schemes editable, a definition freezes once it has data) — into a
> concrete build plan, checked against the code as it actually is
> (`packages/domain`, `packages/application`, `packages/web` as of
> commit `6d47a25`).
>
> **Nothing here is implemented yet.** This is the design to build
> Milestone 11 against, in the same relationship
> `milestone-8-design.md` had to Milestone 8.

---

## 0. Objective & exit criteria

**Objective.** Close every alignment finding from the Milestone 9
walkthrough so the walkthrough can be re-run and signed.

**MVP exit gate.** The Milestone 9 walkthrough Definition of Done: the
product owner completes the full workflow unaided with **no open P0**,
and the P1 findings from 2026-09-09 — **F-01** (patient contact PII),
**F-02** (patient age), **F-03** (control cap), **F-05** (deliberate
delete) — are **resolved or explicitly waived**. P2/P3 findings
(**F-04, F-06, F-07, F-08, F-09**) are expected to land in the same
milestone but do not individually block sign-off.

**Completion criteria.**

- `grep` for `patient` + `email`/`phone` across all packages returns
  nothing (ADR 0025).
- A physician can define a capped control type, record exactly `N`, and
  the `N+1`-th is rejected (ADR 0026).
- Editing/removing a scheme element that has recorded data is rejected;
  adding new ones and editing unused ones works (ADR 0027).
- A `Control` persists and reloads with no observations (A4/F-08).
- Every list row navigates on click; no data-destroying action completes
  without a typed confirmation (F-04/F-05).
- Full workspace quality gate green (`lint`, `format:check`, `typecheck`,
  `test`) + `packages/web` Playwright `full-workflow.spec.ts` green.
- The Milestone 9 walkthrough sign-off block reads **Passed**.

---

## 1. Work packages

| WP      | Scope                                                                                                                      | Findings               | ADRs       | Size | Depends on        |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------- | ---- | ----------------- |
| **WP1** | Patient PII demolition + computed age                                                                                      | F-01, F-02             | 0025       | M    | —                 |
| **WP2** | Web UX hardening: row-as-link, deliberate delete                                                                           | F-04, F-05             | —          | S–M  | —                 |
| **WP3** | Editable schemes + typed/capped controls + optional observations (absorbs the "Now" button and the Surgery-detail reorder) | F-03, F-07, F-08, F-09 | 0026, 0027 | L    | — (critical path) |
| **WP4** | Doc closeout + walkthrough re-run & sign-off                                                                               | all                    | 0025–0027  | S    | WP1–WP3 merged    |

```
WP1 (M) ─┐
WP2 (S) ─┼─► WP3 (L) ─► WP4 (S) ─► Milestone 9 walkthrough sign-off = MVP out
         ┘   domain → application/ports → infra/migrations → http/e2e → web
```

WP1 and WP2 are independent surfaces and run in parallel first (separate
git worktrees, as Milestones 4–7 did). WP3 is the bulk of the work and
the critical path. WP4 begins only once WP1–WP3 are on `main`.

---

## 2. Scoping decisions (confirmed with the product owner, 2026-09-09)

1. **Control definitions add typing + the occurrence rule only.** For the
   MVP a control definition does **not** own a subset of `CONTROL`-scoped
   CustomFields — those stay attached to the `ProcedureType` and render
   on every control form as they do today. Partitioning "only the
   pain-scale field shows for the pain-scale control" is **deferred**
   (post-MVP). This keeps WP3 to one aggregate change. Recorded against
   ADR 0026's "Not decided here".
2. **Patient personal fields are inlined on `Patient`**, not extracted
   into a `PatientIdentity` value object — ADR 0025 explicitly leaves
   this an implementation choice; inline is the least churn.
3. **The completeness / next-due projection is computed on read**, never
   stored (ADR 0026).
4. **B4 ("Now" button) and B5 (Surgery-detail card reorder) are built
   inside WP3**, not WP2 — they edit `RecordControlForm` and
   `SurgeryDetail`, which WP3 already rewrites.

---

## 3. WP1 — Patient PII demolition + age (ADR 0025)

### 3.1 Domain

- `Patient` **stops composing `Person`**. Inline `firstName`,
  `lastName`, `dateOfBirth` on `Patient` with their own presence checks
  in `Patient.create` (`firstName`/`lastName` non-empty after trim,
  `dateOfBirth` present). Keep `id`, `physicianId`, `dni?`,
  `observations?`, `metadata?`.
- Remove the `phone` / `email` getters and any equality/identity use of
  them (`sameIdentityAs` already compares only ids — unchanged).
- `Person` is **untouched** — it stays the Physician/Resident shape with
  `phone` + `email` required. Resident keeps `phone` deliberately.
- Update `patient.test.ts`: drop phone/email cases, keep/adjust the
  required-field cases.

### 3.2 Application

- `RegisterPatientInput` loses `phone` / `email`.
- Any patient read/list mapper stops emitting them.
- `validate-custom-field-values` and other shared code do not touch
  Patient personal fields — no change expected; confirm.

### 3.3 Infrastructure

- Migration `drop_patient_contact_pii` → `ALTER TABLE patients DROP
COLUMN phone, DROP COLUMN email`. No data backfill — no production
  patient data exists (walkthrough run 2026-09-09 with fake data).
- `PrismaPatientRepository` + its round-trip tests: remove the two
  fields from the row mapping.

### 3.4 HTTP

- Patient route body schemas, `PatientDto` / `serializePatient`, and the
  patient e2e tests lose both fields.

### 3.5 Web

- `PatientForm` — remove the two inputs.
- `PatientList` — remove the `phone` and `email` columns; **add an
  `Age` column**.
- `PatientDetail` — remove the two rows; show **age next to the date of
  birth**.
- `patients/mappers.ts` — add `age: number` to the view model, computed
  from `dateOfBirth` at map time (full years elapsed to `today`). Pure
  function, unit-tested in `mappers.test.ts`.
- `patients/schemas.ts` — drop the two fields.
- `messages/en.ts` — remove `patients.columns.phone` / `.email`; add
  `patients.columns.age` and the age format string.
- `e2e/test-physician.ts` and `e2e/full-workflow.spec.ts` fixtures —
  remove phone/email from patient creation.

### 3.6 Tests

Domain unit (Patient), Application (register/list mappers with fakes),
Infrastructure round-trip (no phone/email column), HTTP e2e (register →
retrieve, no contact fields on the wire), Web (`mappers.test.ts` age
derivation), Playwright (`full-workflow.spec.ts` still green).

---

## 4. WP2 — Web UX hardening (F-04, F-05)

`packages/web` only. No Domain / Application / HTTP change.

### 4.1 B2 — the whole table row is the link

- **Pattern:** stretched link. The row (or its first cell) is
  `position: relative`; a single `<Link>` gets an absolutely-positioned
  `::after` (or an overlay span) covering the row. Inline secondary
  controls (delete buttons, credential actions) get `position: relative;
z-index: 1` so they stay clickable above the overlay. The row link is
  a real `<a>` — keyboard focus and screen-reader semantics are
  preserved; do **not** attach `onClick` to a `<tr>`.
- **Applies to:** `PatientList`, `SurgeryList`, `ResidentList`,
  `ProcedureTypeList`, the research-studies list, and the
  resident-session surgery list.
- **Doc:** add "row-as-link" to `docs/design/design-system.md` (Table
  section). `ux-laws`: _Fitts's Law_, _consistency_.

### 4.2 B3 — deliberate (type-to-confirm) delete

- New `components/ui/DangerousConfirm.tsx`: a `<dialog>` whose confirm
  button stays `disabled` until the user types a required phrase (the
  record's name, or `DELETE` when there is no obvious name). Built on
  the existing `ConfirmSubmit` mechanics + a controlled text input.
- **Swap into:** `DeleteResearchStudyButton`, `RemoveSurgeryButton`
  (study universe), `RemoveResidentButton` (pre-participation removal),
  and the deactivate action in `ResidentCredentialActions`.
- Keep the light `ConfirmSubmit` for reversible actions (e.g. logout,
  research-study state transitions).
- **Docs:** `docs/design/ux-principles.md` (the _Forgiving_ principle —
  call it out as the product owner did) and `design-system.md` (the two
  tiers and when each applies).

### 4.3 Tests

Component/action tests for `DangerousConfirm` (button disabled until the
phrase matches; submits only then). Playwright: extend `full-workflow`
to delete a DRAFT research study via the typed confirmation.

---

## 5. WP3 — Editable schemes + typed/capped controls + optional observations (ADRs 0026, 0027)

Build strictly in this order: **domain → application/ports →
infra/migrations → http/e2e → web**.

### 5.1 Domain

**Occurrence rule + control definition**

- `ControlOccurrenceRule` (discriminated union in
  `packages/domain/src/procedure-type/`):
  - `{ mode: "uncapped" }`
  - `{ mode: "capped"; count: number; period: { every: number; unit: "hours" | "days" | "weeks" } }`
  - validation: `count` integer `≥ 1`; `period.every` integer `≥ 1`;
    `unit` in the allowed set.
- `ControlDefinition` class (id, name, occurrenceRule), owned by
  `ProcedureType` as an internal collection — mirrors `CustomField`:
  - `ProcedureType.addControlDefinition(def, actingPhysicianId)` with
    name-uniqueness within the type;
  - `ProcedureType.reconstitute(...)` hydrates `controlDefinitions`
    alongside `customFields`;
  - `get controlDefinitions(): readonly ControlDefinition[]`.

**Control**

- `Control` gains optional `definitionId`.
- `observations` becomes **optional**: `Control.create` and
  `updateObservations` drop the non-empty `DomainError`; empty/absent is
  stored as `undefined` (A4/F-08). `recordedAt` and `author` stay
  mandatory.

**Surgery — the cap invariant**

- `Surgery.recordControl(input, cappedContext?)` where `cappedContext` is
  the resolved capped rule for `input.definitionId` (or absent for
  uncapped / ad-hoc). Surgery counts
  `controls_.filter(c => c.definitionId === input.definitionId)` and
  throws `DomainError` if that count is already `>= cappedContext.count`.
  The cap is **per Surgery**, all authors combined.
- Off-schedule datetimes are **not** validated here — the schedule is a
  read-side projection only.

**ProcedureType — the freeze rule (ADR 0027)**

- `editCustomField(id, changes, actingPhysicianId, { inUse })`,
  `removeCustomField(id, actingPhysicianId, { inUse })`,
  `editControlDefinition(id, changes, actingPhysicianId, { inUse })`,
  `removeControlDefinition(id, actingPhysicianId, { inUse })`.
- Each throws `DomainError` ("this field/control has recorded data and
  can no longer be changed") when `inUse === true`. All-or-nothing per
  definition — no partial "label yes, type no" edits.
- Adding is always allowed; `ProcedureType` is still never deleted
  (ADR 0011).

### 5.2 Application + ports

- `SurgeryRepository` gains:
  - `isCustomFieldDefinitionInUse(definitionId): Promise<boolean>` —
    any `CustomFieldValue` row referencing it, tenant-scoped;
  - `isControlDefinitionInUse(definitionId): Promise<boolean>` — any
    `Control` row referencing it, tenant-scoped.
- New operations (factory-function pattern, fakes-based tests):
  - `addControlDefinition`, `editControlDefinition`,
    `removeControlDefinition`;
  - `editCustomField`, `removeCustomField`
    (siblings of the existing `add-custom-field.ts`).
  - Each mutation op loads the `ProcedureType`, calls the matching
    repository `is…InUse` check, passes `{ inUse }` to the domain
    mutator, saves.
- `record-control` / `modify-control`: accept optional `definitionId`;
  load the owning Surgery's `ProcedureType`, resolve the control
  definition, and pass the capped context into `Surgery.recordControl`.
  (`record-control` already loads the ProcedureType for
  `validate-custom-field-values` — reuse that load.)
- **Follow-up projection** in `get-surgery` and
  `get-surgery-for-resident`: for each capped control definition of the
  Surgery's ProcedureType, emit
  `{ definitionId, name, recorded, expected: count, nextDueAt }` where
  `nextDueAt = performedAt + (recorded + 1) * period` (only while
  `recorded < count`). Computed, not stored.

### 5.3 Infrastructure

- Migration `add_control_definitions_and_optional_observations`:
  - `control_definitions` (id PK, `procedure_type_id` FK → `procedure_types`,
    `name`, `occurrence_mode` text, nullable `occurrence_count` int,
    nullable `occurrence_period_every` int, nullable
    `occurrence_period_unit` text, `created_at`, `updated_at`);
    `@@index([procedure_type_id])`.
  - `controls.definition_id` nullable + `@@index`; FK to
    `control_definitions` is optional (id-only is acceptable, mirroring
    the `SurgeryParticipant` / `research_study_surgeries` precedent —
    implementation call, not fixed here).
  - `controls.observations` → **nullable**.
- `PrismaProcedureTypeRepository` — load/save `controlDefinitions`.
- `PrismaSurgeryRepository` — persist `control.definitionId`; implement
  the two `is…InUse` `count` queries (both filtered through the
  physician's own ProcedureType / Surgery rows).

### 5.4 HTTP

- `POST /procedure-types/:id/control-definitions`
- `PATCH /procedure-types/:id/control-definitions/:defId`
- `DELETE /procedure-types/:id/control-definitions/:defId`
- `PATCH /procedure-types/:id/custom-fields/:fieldId`
- `DELETE /procedure-types/:id/custom-fields/:fieldId`
- `record-control` / `modify-control` bodies: accept `definitionId`;
  `observations` no longer required.
- `get-surgery` response: add `followUp[]`.
- Fastify JSON-schema validation on every new body/param (structural
  only — no re-implementation of the domain rules).

### 5.5 Web

- **Scheme editor** (`features/procedure-types/components`):
  - manage control definitions: name + an `uncapped`/`capped` toggle;
    when capped, `count` + period `every` + unit select;
  - `edit` / `remove` affordances on both CustomFields and control
    definitions, **disabled with an inline explanation** when the
    definition is in use ("recorded data exists — add a new one
    instead"); removal of an unused definition goes through
    `DangerousConfirm` (WP2).
- **`RecordControlForm`** + the resident-session record form:
  - optional control-type `<select>` (the ProcedureType's control
    definitions);
  - a **"Now"** button that fills the datetime input with the current
    date-time (B4);
  - when a capped type is already at `N` on this Surgery, disable submit
    for that type with a message.
- **`SurgeryDetail`** (+ resident surgery view): reorder cards to
  **Summary → Control history (inline "record a Control") → Residents**
  (B5); render the follow-up indicator per capped definition
  ("3 of 4 recorded · next due ~48 h").
- `messages/en.ts` — all new copy.

### 5.6 Tests

- **Domain:** occurrence-rule validation; `addControlDefinition` name
  uniqueness; `Surgery.recordControl` accepts `N`, rejects `N+1`;
  uncapped unchanged; `Control` with no observations valid; freeze-rule
  mutators throw when `inUse`.
- **Application (fakes):** each new op; `record-control` resolving the
  cap context; `get-surgery` follow-up projection math; freeze check
  wired to the repo flag.
- **Infrastructure round-trip:** control definitions save/reload; a
  Control with `definitionId` and null observations; `is…InUse` returns
  true only when a value/recording exists and only within the tenant.
- **HTTP e2e:** capped type → record `N` → `N+1` rejected; edit a
  CustomField with recorded values → rejected; add a new definition →
  allowed; get-surgery carries `followUp`.
- **Playwright:** extend `full-workflow` — define a capped control type,
  record it, see the indicator; attempt a frozen edit and see it
  blocked.

---

## 6. WP4 — Doc closeout + walkthrough sign-off

- **DOMAIN.md** — Patient shape (no contact PII); Control (optional
  observations, `definitionId`, cap + measurement period); ProcedureType
  (editable schemes + freeze rule).
- **ROADMAP.md** — add WP1–WP3 to the MVP line; mark the Milestone 9
  walkthrough performed; update the Capability Map (Patient /
  Surgery+Control / CustomField rows, the Human-E2E column, and a new
  "Control schemes & cardinality" row); add this milestone's entry.
- **alignment-restructuring.md** — flip A1/A2/A3/A4/B1–B5 to 🟢 as each
  lands.
- **ADRs 0025–0027** — add an "Implemented in Milestone 11" line to each
  Status section.
- **design-system.md / ux-principles.md** — row-as-link + the two
  delete-confirmation tiers (from WP2).
- **Milestone 9 walkthrough** — re-run with the product owner (full
  script, or a focused delta over sections 2/3/5), fill the Findings Log
  outcomes and the **sign-off block = Passed**.

---

## 7. Risks & mitigations

| Risk                                                                                                          | Mitigation                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| WP3 scope creep into per-definition CustomField partitioning                                                  | Explicitly deferred (§2.1), product-owner-confirmed; recorded in ADR 0026's "Not decided here" during WP4.                                  |
| `Surgery.recordControl` signature change ripples to the resident record path, `fakes.ts`, and every call site | Contained but wide; land the domain+fakes change first, compile-check before touching Application.                                          |
| Freeze-check `is…InUse` queries could leak cross-tenant existence                                             | Both queries filtered through the acting physician's own ProcedureType/Surgery rows; called out as a review checkpoint.                     |
| Migrations run against the shared Railway Postgres via `preDeployCommand`                                     | No real data yet; standard `prisma migrate deploy` flow; the two migrations are additive except the Patient column drop, which has no data. |
| `Person` removal from `Patient` breaks shared test helpers                                                    | `Person` itself is untouched; only `Patient` stops importing it — scope the change to the patient slice and run the full gate.              |

---

## 8. What this milestone deliberately does not do

- Per-control-definition CustomField sets (deferred — §2.1).
- Reminders/notifications when a scheduled control timepoint passes
  (notifications deferred, ADR 0008).
- A "deprecate / stop offering" flag for a frozen definition (ADR 0027's
  "Not decided here").
- Any change to Physician/Resident `phone`/`email` (ADR 0025 scope is
  Patient only).
- Surgery/Control delete-path changes, Platform Admin, CI/CD — all still
  post-MVP per ROADMAP.

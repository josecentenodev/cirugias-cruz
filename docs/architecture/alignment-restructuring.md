# Alignment & Restructuring — post-walkthrough directives

## Purpose & provenance

This document consolidates the restructuring directives that came out of a
working session with the **product owner (the physician who commissioned
the product)** on **2026-09-09**, run alongside the Milestone 9 human
walkthrough (`milestone-9-walkthrough.md`).

The walkthrough confirmed the core MVP workflow is completable end-to-end
through the deployed product. It also surfaced a set of alignment gaps
between what is built and how the physician actually needs to work. Those
gaps are recorded here as the single source of truth for the follow-up
work, ahead of MVP closure.

Each item below states: the physician's directive (as given), the
interpretation we are committing to, the current state in code, the work
required per layer, whether a numbered ADR is needed, priority, and any
open question that still needs the physician before implementation.

> **This is a planning artifact.** As each item lands, mark it and
> cross-reference the ADR / milestone that carried it.

## Implementation status (Milestone 11)

| Done (merged to `main`)                                                                                                 | Pending                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **A1** Patient contact-PII removed + `Patient` no longer composes `Person` + Railway migration applied (ADR 0025) — WP1 | **C3 / WP4** last doc reconciliation + the Milestone 9 walkthrough sign-off (a short delta re-run with the product owner) |
| **A2** capped control definitions — `≤ N` Surgery invariant + measurement-period follow-up projection (ADR 0026) — WP3  |                                                                                                                           |
| **A3** editable Procedure Type schemes, frozen once a definition has data (ADR 0027) — WP3; Railway migration applied   |                                                                                                                           |
| **A4** Control `observations` optional — WP3                                                                            |                                                                                                                           |
| **B1** computed patient age in the UI — WP1                                                                             |                                                                                                                           |
| **B2** whole-row table links — WP2                                                                                      |                                                                                                                           |
| **B3** type-to-confirm deletion (`DangerousConfirm`) — WP2                                                              |                                                                                                                           |
| **B4** "Now" datetime button on the control forms — WP3                                                                 |                                                                                                                           |
| **B5** Surgery-detail card reorder (Summary → Follow-up → Control history → Residents) — WP3                            |                                                                                                                           |

All build work for Milestone 11 is merged to `main` (WP1+WP2 via
`feat/milestone-11-alignment`, WP3 via `feat/milestone-11-wp3`); full
quality gate green; both migrations applied to the Railway Postgres.
What remains is **WP4**: this reconciliation pass and the product-owner
delta walkthrough that lets `milestone-9-walkthrough.md` be signed.

**Scope notes / deviations recorded during WP3:**

- **`modify-control` does not accept `definitionId`.** A Control's type is
  set at record time only; `Surgery.modifyControl` has no affordance to
  re-type a Control. Adding one is a later change if the physician wants it.
- **CustomField-definition editing is remove-only in the web scheme
  editor.** The API and `editCustomFieldAction` are complete and wired;
  the inline _edit form_ for a CustomField definition was not built
  (control-definition editing _is_ fully built). CustomField rows show
  Remove + the "recorded data exists" freeze note.
- **The web freeze indicator is a presentation-layer join** (scans
  `listSurgeries()`); the API still enforces the freeze rule
  authoritatively on every mutation, so a stale client view cannot bypass
  it.

Exception (product owner, Option A, 2026-09-09): `ResidentList` rows stay
non-links — there is no resident detail route in `packages/web` and
building one is out of scope. Documented in `design-system.md`.

## Status legend

| Mark | Meaning                  |
| ---- | ------------------------ |
| 🔴   | Not started              |
| 🟡   | In design / ADR drafting |
| 🟢   | Implemented & verified   |

## Priority

- **P1** — blocks MVP closure (correctness, privacy, or "the physician
  cannot work the way the domain requires").
- **P2** — required for a coherent MVP but not blocking sign-off; can land
  in a fast follow.
- **P3** — improvement, explicitly low priority per the physician.

---

## A. Domain / model changes (ADR-bearing)

### A1 — Remove `email` and `phone` from Patient — complete demolition 🟢 · P1

> **ADR drafted:** [0025 — Patient carries no contact PII](../decisions/0025-patient-carries-no-contact-pii.md).

**Directive.** "Tenemos que quitar mail del paciente y número de teléfono
(no sirve). Es una demolición completa: no podemos dejar registro en el
código."

**Interpretation.** A Patient must carry **no** contact-channel PII. Not
"hidden in the UI", not "nullable column left in place" — the fields, their
validation, their DTOs, their form inputs, their table columns, their test
fixtures and their persisted columns are all removed. A future reader of
the code should find no evidence Patient ever had an email or a phone.

**Current state.**

- `packages/domain/src/shared/person.ts` — `Person` is a shape **shared by
  Physician, Resident and Patient** (ADR 0009). It hard-requires `phone`
  and `email` (`Person.create` throws if either is blank), and `equals`
  compares them.
- `packages/domain/src/patient/patient.ts` — `Patient` composes `Person`
  and re-exposes `phone` / `email` getters.
- `packages/infrastructure/prisma/schema.prisma` — `Patient.phone` /
  `Patient.email` columns.
- `packages/http` — patient route body schemas + DTOs include both.
- `packages/web` — `PatientForm`, `PatientList` (dedicated `phone` /
  `email` columns), `PatientDetail`, `patients/dtos.ts`,
  `patients/mappers.ts`, `patients/schemas.ts`, `messages/en.ts`
  (`patients.columns.phone` / `.email`), plus `e2e/full-workflow.spec.ts`
  and `e2e/test-physician.ts` fixtures.

**Physician and Resident keep `email`.** Physician `email` is the tenant
identity and login (ADR 0012); Resident `email` backs the
physician-issued-credential login (ADR 0017). So this is **not** a change
to `Person` that can cascade to all three — Patient must stop sharing the
contact-bearing shape.

**Committed approach.** Split the shape. Patient gets its own identity
value object — `firstName`, `lastName`, `dateOfBirth`, plus the already-
Patient-only `dni?` and `observations?` — and **no** `phone` / `email`.
`Person` (renamed or kept) stays the Physician/Resident shape with
`email` required and `phone` reconsidered (see open question). This
matches ADR 0009's own "Not decided here" note that a shared
implementation base type was never mandated.

**Work by layer.**

- **Domain** — introduce `PatientIdentity` (or inline the fields on
  `Patient`); drop `phone` / `email` from `Patient`; update
  `patient.test.ts`. Decide `Person`'s future (keep for
  Physician/Resident only).
- **Application** — `register-patient.ts` input + mapper; any patient
  read mappers.
- **Infrastructure** — Prisma migration dropping `Patient.phone` /
  `Patient.email`; `PrismaPatientRepository` + its round-trip tests.
- **HTTP** — patient route schemas + DTOs + e2e.
- **Web** — remove the two form fields, the two table columns, the two
  detail rows, the two message keys, the schema fields, the fixtures.

**ADR.** [0025](../decisions/0025-patient-carries-no-contact-pii.md) —
amends ADR 0009, touches the ADR 0021 area.

**Resolved (2026-09-09).** The **Resident** keeps `phone` — the demolition
is Patient-only. Physician `email` stays as identity. So `Person` (or its
successor) remains the Physician/Resident shape with `firstName`,
`lastName`, `phone`, `email`, `dateOfBirth`; **only Patient** stops
carrying `phone` / `email`.

---

### A2 — Capped controls with a measurement period ("Escala de Dolor") 🟢 · P1

> **ADR drafted:** [0026 — Control definitions with an optional recording cap and measurement period](../decisions/0026-control-types-cap-and-measurement-period.md).

**Directive.** "Un control se puede cargar infinitas veces si no tiene
tope de cargas. Cuando tiene tope de cargas, pasan a ser obligatorias las
cargas — exactamente N — y deben tener un período de medición en el
tiempo (por ejemplo cada 24 h, cada 48 h, cada 12 h)."

**Interpretation.** Every control has a **type** (part of a Procedure
Type's control scheme — see A3). A control type is in one of two modes:

- **Uncapped (default)** — no limit. Recorded zero-to-many times per
  Surgery, entirely at the physician's discretion. This is today's
  behaviour, unchanged; it stays the default so nothing regresses.
- **Capped** — the physician sets a cap `N` **and** a measurement period
  `P` (e.g. every 12 h / 24 h / 48 h). Then:
  - the `N` recordings become **mandatory** — the Surgery's follow-up is
    incomplete until all `N` exist (this is a _completeness_ expectation
    surfaced in the UI, not a write-blocking invariant — a Surgery with
    missing capped controls is still a valid Surgery);
  - **exactly `N`** may be recorded — the `N+1`-th recording of that type
    on that Surgery is **rejected** (this _is_ a write invariant on the
    Surgery aggregate);
  - the `N` recordings are expected at successive multiples of `P` from a
    baseline (the Surgery's performed date, unless the physician says
    otherwise — open question). The period is the schedule the physician
    reads against; whether an off-schedule recording is blocked or just
    flagged is an open question below.

**Current state.** No control-type concept anywhere. `Surgery.recordControl`
only checks tenant + author. `physician-prototype-analysis.md` already
flagged this exact shape ("a once-per-Control measurement at fixed
timepoints") as evidence the model was missing something.

**Committed approach (to be detailed in an ADR, not here).** A Procedure
Type owns a set of **control definitions** (name + `CONTROL`-scoped
CustomFields + an occurrence rule). The occurrence rule is either
`{ mode: "uncapped" }` or
`{ mode: "capped", count: N, period: { every: number, unit: "hours" } }`.
When a Control is recorded it references a control definition;
`Surgery.recordControl` rejects a recording that would make a capped
definition exceed `N` on that Surgery. Completeness ("all N recorded")
and the period schedule are computed for display, not enforced as
write-blocks. Do **not** hard-code "Pain Scale", "24 h", or any clinical
content — the physician defines the schemes, exactly as with CustomFields.

**Work by layer.** Domain (new `ControlDefinition` inside the
`ProcedureType` aggregate, carrying the occurrence rule; `Control.definitionId`;
the "≤ N per capped definition" invariant on `Surgery.recordControl`),
Application (record/modify control operations; a per-Surgery
follow-up-completeness projection for reads; procedure-type scheme-edit
operations — see A3), Infrastructure (schema + migration + repo), HTTP
(routes + the completeness data on the get-surgery response), Web (scheme
editor with the uncapped/capped + period picker; control form driven by
the chosen definition; a "3 of 4 pain-scale controls recorded, next due
~48 h" indicator on the Surgery detail).

**ADR.** [0026](../decisions/0026-control-types-cap-and-measurement-period.md).
This is new product input, so it is **not** blocked by the project's
"don't invent Control semantics" rule — the product owner is supplying
the semantics.

**Open questions — resolved 2026-09-09.**

- **Baseline for the period** → from the **Surgery's performed date**.
  Expected timepoint `k` = `performedAt + k · period`.
- **Off-schedule recordings** → **allowed** (never blocked by the
  schedule). The period only drives the "next due" display; the UI may
  flag an off-schedule recording but the domain does not reject it.
- **Editing the cap after recordings exist** → **not allowed** — a
  control definition freezes the moment the first `Control` references it
  (see A3 / ADR 0027). Change `N` or `period` by adding a **new**
  definition.
- **Ad-hoc controls** → **still allowed**. A `Control` may reference no
  definition (free-text + datetime, as today); such controls are
  uncapped by nature.
- **Period units** → `hours`, `days`, **and** `weeks`.
- **Per Surgery vs per author** → the cap is **per Surgery**, counting
  all authors together.

---

### A3 — Control schemes must be editable 🟢 · P2

> **ADR drafted:** [0027 — Procedure Type schemes are editable, but a definition freezes once it has data](../decisions/0027-procedure-type-scheme-editable-frozen-once-used.md).

**Directive.** "Se tienen que poder editar los esquemas de controles."

**Interpretation.** The physician maintains the control/measurement schema
of a Procedure Type over time — add, **edit**, and remove field/scheme
definitions — without creating a new Procedure Type.

**Current state.** `packages/web/src/features/procedure-types/actions.ts`
exposes only `addCustomFieldAction`. There is **no** edit and **no**
remove for a CustomField definition once added; only the Procedure Type's
`name` / `description` are editable (`ProcedureTypeEditForm`). Procedure
Types themselves are intentionally never deleted (ADR 0011) — that stays.

**Committed rule (2026-09-09).** A scheme element becomes **frozen** the
moment data is recorded against it — a CustomField definition once any
Surgery/Control holds a value for it, a control definition once any
Control references it. Frozen = **no edit, no remove**, all-or-nothing per
definition (not "edit the label but not the type"). Adding new
definitions is always allowed; editing/removing a definition with **no**
data is allowed. To change a scheme element that has data, add a new
definition and stop offering the old one — the old one stays for its
historical data.

**Work by layer.** Domain (add/edit/remove mutators on `ProcedureType`
for its CustomField and control definitions, each assuming "no data" was
verified upstream), Application (edit/remove operations that run the
freeze check against `SurgeryRepository` — same shape as ADR 0021's
`dni` check), HTTP (`PATCH` / `DELETE` routes per definition), Web (edit
& remove affordances in the scheme editor, disabled with an explanation
when frozen; removing an unused definition still uses the B3 confirm
pattern).

**ADR.** [0027](../decisions/0027-procedure-type-scheme-editable-frozen-once-used.md)
— amends ADR 0011, closes ADR 0018's mutability open point.

---

### A4 — Control observations are optional 🟢 · P3

**Directive.** "En el control puede que no haya observaciones. Las
observaciones están entorpeciendo un poco los esquemas — pero prioridad
muy baja."

**Interpretation.** `observations` on a `Control` becomes optional. A
Control with only a datetime, an author, and its CustomField values is
valid. (Longer term the physician sees observations as secondary to the
structured schemes — but only the optionality is in scope now.)

**Current state.** DOMAIN.md / project skill: a Control has "observations

- a mandatory datetime + an author". Verify whether the domain currently
  requires non-empty observations and whether the Prisma column is already
  nullable.

**Work by layer.** Domain (`Control` record/modify — drop the non-empty
requirement), Application, Infrastructure (nullable column + migration if
needed), HTTP (schema), Web (`RecordControlForm` — no longer required).

**ADR.** Light — a one-paragraph amendment note against the Control rule
in DOMAIN.md is enough; a full numbered ADR only if the physician wants
the "observations are secondary" framing recorded.

---

## B. UI / UX changes (`packages/web` + design docs)

### B1 — Compute and show patient age in the UI 🟢 · P1

**Directive.** "Se tiene que calcular la edad en la UI del paciente. Por
más que tengamos la fecha de nacimiento, el cálculo ayuda mucho al
usuario, que no debe hacerlo — pierde energía y concentración en su
trabajo."

**Interpretation.** Wherever a patient's date of birth is shown, show the
**computed age** next to it (e.g. `1980-04-12 (45)`), computed at render
time. Never ask the physician to do the arithmetic.

**Scope.** `packages/web` only — a pure derivation in
`patients/mappers.ts` (add `age` to the view model) surfaced in
`PatientList` and `PatientDetail`. No domain / API change — age is not
stored, it is derived from `dateOfBirth`. Add a message key for the
format. Consider showing it on the Resident's surgery panel too if a
patient DOB is shown there.

**ADR.** No.

---

### B2 — The whole table row is the link 🟢 · P2

**Directive.** "En todas las tablas, la fila debería ser el link, no el
nombre del dato como lo es actualmente."

**Interpretation.** In every list/table, clicking anywhere on a row
navigates to that record's detail. Today only the name cell is an `<a>`
(e.g. `PatientList` links `patient.fullName`).

**Scope.** `packages/web` — every list component: `PatientList`,
`SurgeryList`, `ResidentList`, `ProcedureTypeList`, research studies list,
and the Resident session's surgery list. Implement with an accessible
pattern (a real anchor per row via the "stretched link" technique — the
row stays keyboard-focusable and screen-reader-correct; do not attach a
bare `onClick` to a `<tr>`). Keep secondary actions in a row (delete,
etc.) above the row link in the stacking/inert order so they stay
clickable.

**Doc update.** Add the "row-as-link" pattern to
`docs/design/design-system.md` (Table section) so it is applied
consistently. Relevant `ux-laws` principles: _Fitts's Law_ (larger target),
_consistency_.

**ADR.** No — design-system doc change.

---

### B3 — No accidental one-click delete 🟢 · P1

**Directive.** "Tenemos que evitar que el usuario pueda borrar a la
primera al apretar un botón. Ya lo he mencionado como eje fundamental de
UX: no podemos permitir que las personas se equivoquen — tienen que
hacerlo a conciencia."

**Interpretation.** A single click must never destroy data. The current
`ConfirmSubmit` yes/no `<dialog>` (Milestone 10) is not enough friction
for the physician — a destructive action needs a **deliberate**
confirmation: the person must do something that cannot be produced by an
accidental double-click, e.g. **type the record's name or the word
`DELETE`** to enable the confirm button, with the button disabled until
then.

**Current destructive actions in scope.** `DeleteResearchStudyButton`
(DRAFT studies), `RemoveSurgeryButton` (study universe),
`RemoveResidentButton` (resident off a surgery — pre-participation),
`ResidentCredentialActions` (deactivate credential), and Control
delete/edit-destructive if present. Patient / Surgery / Procedure Type
have no delete path by design — unchanged.

**Scope.** `packages/web` — a shared `DangerousConfirm` component
(type-to-confirm) replacing bare `ConfirmSubmit` on data-destroying
actions; keep the light dialog for reversible ones. Update
`docs/design/ux-principles.md` (the _Forgiving_ principle) and
`design-system.md` with the pattern and when each tier applies.

**ADR.** No — UX-principles / design-system doc change, but call it out
explicitly there because the physician named it "fundamental".

---

### B4 — "Now" for the control datetime 🟢 · P2

**Directive.** "El horario de los controles se debe poder fijar al
now()."

**Interpretation.** The control datetime input gets a **"Now"** action
that fills the current date and time (still editable afterwards).

**Scope.** `packages/web` — `RecordControlForm` and the Resident session's
record-control form. Client-side fill of the existing datetime input; no
API change (the datetime is already sent explicitly). Add a message key.

**ADR.** No.

---

### B5 — Control history is mis-placed on the Surgery detail 🟢 · P2

**Directive.** "El control history está mal ubicado."

**Interpretation.** On `SurgeryDetail.tsx` the card order is: Surgery
summary → **Residents** → Control history → Record-a-Control form. The
Control history is the primary artifact of a Surgery follow-up; it should
sit **immediately under the Surgery summary**, with the record-control
affordance attached to it (history + "add" together), and Residents
management moved **below** as secondary.

**Scope.** `packages/web` — reorder the cards in `SurgeryDetail.tsx`
(and mirror the ordering in the Resident session's surgery view). No API
change.

**ADR.** No.

**Open question for the physician.** Confirm the intended order:
proposed is **Summary → Control history (with inline "record") →
Residents**. If the record form should stay a separate card, say whether
it goes above or below the history.

---

## C. Process & documentation

### C1 — This alignment/restructuring document 🟢

The physician called an alignment/restructuring document "fundamental for
the MVP". This file is it. Keep it current as items land.

### C2 — Update the Milestone 9 walkthrough as _performed_ 🟢

`milestone-9-walkthrough.md` gets a "Walkthrough outcome" section
recording that it was run with the product owner, that the core workflow
is completable unaided, and that the conclusions above (A1–B5) are its
findings. Sign-off filled as **passed with alignment follow-ups** (no P0
open — the follow-ups are P1–P3 restructuring, not workflow blockers).

### C3 — Downstream doc & ADR updates (follow-up) 🟡

- **New ADRs** — **drafted**:
  [0025](../decisions/0025-patient-carries-no-contact-pii.md) (A1,
  amends ADR 0009),
  [0026](../decisions/0026-control-types-cap-and-measurement-period.md)
  (A2),
  [0027](../decisions/0027-procedure-type-scheme-editable-frozen-once-used.md)
  (A3, amends ADR 0011). A4 stays an amendment note; B-items are
  design-doc changes.
- **DOMAIN.md** — Patient shape (no email/phone), Control (optional
  observations, control definitions & cardinality), ProcedureType
  (mutable schemes).
- **ROADMAP.md** — add A1–A3 to the MVP line (P1/P2), record the
  walkthrough as performed, update the Capability Map "Human E2E" column
  and the Patient / Surgery+Control / CustomField rows.
- **design-system.md** — row-as-link (B2), dangerous-confirm tiers (B3),
  "Now" control (B4).
- **ux-principles.md** — Forgiving principle hardened (B3).

---

## Suggested sequencing

1. **A1 + B1** together — both are the Patient screen, both P1, and A1's
   form/table rework is the moment to add the age display.
2. **B3** — small, self-contained, physician-flagged as fundamental.
3. **B2, B4, B5** — one `packages/web` polish pass.
4. **A2 + A3** — one vertical slice (ADRs 0026 + 0027 are drafted; they
   share the "editable Procedure Type scheme" surface). This is the
   largest piece.
5. **A4** — fold into the A2/A3 slice (observations optionality touches
   the same Control code).
6. **C3** doc/ADR updates as each item lands.

# Domain Discovery

> Status: discovery document. This describes current business/domain understanding.
> It is **not** a DDD model. No entities, value objects, aggregates, or use cases
> are declared as implementation artifacts here — classification decisions are
> deliberately deferred until modeling begins.

## Propósito

La plataforma permite a un médico cirujano registrar, seguir y estudiar sus
propias cirugías y pacientes, y utilizar la información acumulada para
investigación clínica. El primer procedimiento de trabajo es **pterigión**.

---

## 1. Actors

| Actor                  | Scope                          | Notes                                                                                                                                                                                              |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform Admin**     | Platform-level, cross-tenant   | Product owner/operator. Not a member of any physician's tenant. Purpose is business/platform management only — never clinical data.                                                                |
| **Physician (Médico)** | Tenant owner                   | **The Physician IS the Tenant** — there is no separate conceptual distinction between "Physician" and "Tenant" in the product model. Full control of own workspace. May act as their own resident. |
| **Resident**           | Inside a physician's workspace | Optional, zero or more. Belongs exclusively to one Physician/Tenant. Created and managed by the Physician; assigned directly to Surgeries, never to a Patient (see §1b).                           |
| **Patient**            | Inside a physician's workspace | Exists only within a tenant, no global identity.                                                                                                                                                   |

### 1a. Shared person shape

Physician and Resident are both people and share the same base personal
information shape:

- `firstName` — required
- `lastName` — required
- `phone` — required
- `email` — required
- `dateOfBirth` — required
- `metadata` — optional

Patient uses the same shape, plus:

- `observations` — optional (Patient only)

No additional personal attributes are assumed for any of these actors.

### 1b. Resident assignment is direct to the Surgery — there is no Patient ↔ Resident relationship

**Superseded rule.** An earlier discovery round modeled Resident
assignment at the Patient level (Resident ↔ Patient), with clinical
participation separately tied to a Surgery. That Patient ↔ Resident
relationship is now **eliminated**. It does not exist in the domain.

The current, authoritative relationship is:

```
Physician
    │
    ├── Residents
    │
    └── Patients
           │
           └── Surgeries
                  │
                  └── Residents participating
                         │
                         └── Controls
```

- The Physician creates and manages Residents.
- The Physician creates Surgeries.
- The Physician assigns one or more Residents **directly to a Surgery**.
- From that assignment, the Resident **participates** in that Surgery —
  even before they have recorded any Control.
- The Resident is never assigned to the Patient. There is no
  Resident ↔ Patient relationship of any kind.
- If the same Patient has another Surgery, the participating Residents
  for that Surgery are determined independently — assignment to one
  Surgery does not carry over to another, even for the same Patient.
- A Resident may participate in multiple Surgeries (of the same or
  different Patients).
- A Resident may participate in one Surgery and not in another Surgery of
  the same Patient.

This reflects that the unit of a Resident's clinical responsibility is
the **Surgery**, not the Patient.

### 1c. Resident removal from a Surgery and participation preservation

A Resident assigned to a Surgery who has **not** recorded any Control for
that Surgery may be removed from it.

Once a Resident has recorded a Control for a Surgery, their participation
in that Surgery must be preserved and **cannot be removed**.

This is not treated as a purely technical immutability constraint: the
product owner considers it clinically relevant because the Resident may
carry professional/civil responsibility for their participation in that
particular Surgery.

- A Resident's participation in one Surgery does not imply participation
  in another Surgery, even for the same Patient.
- The exact implementation of this responsibility rule beyond
  "cannot be removed once a Control was recorded" is still to be
  determined later — not invented now.

---

## 2. Tenancy model (confirmed)

- The physician is the tenant.
- Each workspace is completely private; data never crosses tenant boundaries.
- The same real-world person may exist as independent, unrelated patient
  records in different physicians' tenants. The system does not model or
  infer that these are "the same person." There is no global patient identity.
- Research operates only over data belonging to the researching physician's
  own tenant. There is no cross-physician research.

---

## 3. Platform Admin (confirmed)

Purpose: business/platform management, not clinical oversight.

The Admin can:

- See registered physicians/tenants.
- See platform usage metrics: number of registered physicians, number of
  surgeries, number of controls, number of research studies.
- Activate physician accounts.
- Deactivate physician accounts.
- Access information necessary to manage the business relationship with
  physicians.

The Admin must **not**:

- Access patient clinical information or individual patient records.
- Access individual clinical measurements or control data.
- Access sensitive surgery information.
- Access research content.

```
Platform Admin → business / platform information
Physician Tenant → private clinical information
```

Payment/subscription management is explicitly **out of scope** for the
current iteration (see §11).

---

## 4. Physician (confirmed)

The physician has full control of their own workspace and can:
manage patients, invite patients, manage surgeries, manage residents,
assign residents directly to surgeries (§1b — there is no resident↔patient
assignment), perform patient follow-up (controls), communicate with
patients, manage information related to their own surgeries, and perform
research over their accumulated data.

The physician may act as their own resident — residents are not required.

---

## 5. Patient (confirmed)

Belongs exclusively to one physician's tenant. Uses the shared person
shape (§1a) plus `observations`:

- first name — required
- last name — required
- phone — required
- email — required
- date of birth — required
- `metadata` — optional; free-form extensibility mechanism for information
  useful to the physician that is not yet part of the formal domain model
  (e.g. insurance/health coverage, other context)
- `observations` — optional; free-form notes that don't yet justify a
  structured concept. **Only Patient has this field** — Physician and
  Resident do not.

No additional mandatory attributes are assumed.

---

## 6. Surgery (confirmed, deliberately simplified)

Confirmed information:

- belongs to exactly one Patient
- has exactly one Procedure Type
- has a performance/realization date
- is currently always in state `DONE`
- may initially exist without Controls; is expected to eventually have
  multiple Controls (postoperative follow-up is a core purpose of the
  product, but the domain must not require a Control at surgery-creation
  time)
- has a `metadata` mechanism for information not yet part of the formal
  model — **intentionally unresolved**, not to be defined further here

**Modification and deletion (confirmed):**

- Only the **Physician** may modify a Surgery.
- Only the **Physician** may delete a Surgery.

Explicitly **not** part of this iteration:

- surgery scheduling
- calendar
- pre-operative lifecycle
- future/planned surgery states
- additional Surgery lifecycle states beyond `DONE`

No surgery-specific clinical fields are assumed beyond the above.

---

## 7. Controls (confirmed)

A **Control** is the concrete observation/measurement recorded during
postoperative follow-up.

- **Follow-up is not a domain entity.** It is the process of accumulating
  Controls over time for a surgery.
- A Control belongs to exactly one Surgery.
- A Control has `observations` and a mandatory date/time.
- A Control records **who performed it** — either the Physician directly,
  or a Resident who is assigned to (participating in) that specific
  Surgery (see §1b/§10).
- Controls are created **manually** by the physician (or a participating
  resident) whenever they want to record an observation.
- There is no automated control scheduling, no requirement to
  auto-generate controls, and no enforced control frequency in this
  iteration — timing is determined by the physician per patient.
- A Control may contain multiple CustomFields/measurements. Each
  CustomField can be recorded **only once** within a given Control.
  (CustomField's own value model remains unresolved — see §9.)
- **Interpretation/observations of a Control is free text** for this
  iteration — an explicit, deliberate simplification, not a placeholder
  for a "better" design. The domain should preserve room to make
  interpretation more structured later, without that structure being
  decided now.

**Modification and deletion (confirmed):**

- Only the **Physician** may modify a Control.
- Only the **Physician** may delete a Control.
  (Note: a Resident may _perform_/record a Control if participating in
  that surgery, but only the Physician may modify or delete it.)

A Surgery may exist without any Controls — the domain must not require
one to be created at surgery-creation time.

---

## 8. Procedure Types (confirmed, open in detail)

- Procedure Types are owned and managed by the Physician within their own
  tenant. Only the Physician can create or modify Procedure Types.
- Procedure Types are not fixed globally; not a fixed enum.
- Pterygium is the first Procedure Type.
- The physician must be able to work with multiple procedure types over time.
- Procedure Types support extension via the CustomField mechanism (§9).

**Current initial idea (not yet closed) of what a Procedure Type may contain:**

- `name`
- `description`
- surgical technique

For Pterygium, the initial known surgical technique options are:

- Conjunctival autograft
- Conjunctival autograft + MMC
- Amniotic membrane
- Autograft + fibrin glue

These are documented as current domain knowledge, not a final or
exhaustive list. No additional techniques are assumed. The exact final
Procedure Type model (including whether/how technique options are
structured) will be researched and refined later.

**Deletion rule (confirmed):** A Procedure Type must **not** be deleted.
This is an explicit business decision — Procedure Types may be referenced
by historical surgeries and clinical research, so removing one would
orphan that history. No soft-delete, archival, or replacement behavior is
assumed or proposed at this stage; additional lifecycle rules will only be
introduced if explicitly requested later.

---

## 9. Customization / CustomFields (confirmed)

The platform supports **controlled** extensibility, not an arbitrary
form-builder. The platform owns the core domain concepts (Patient, Surgery,
Control, Procedure Type, Research); the physician customizes the
information captured _within_ those concepts.

CustomField structure:

- `name` — required
- `description` — optional
- `unit` — required
- `magnitude` — required

CustomFields can extend: Procedure Types, Surgeries, Controls, and other
predefined clinical concepts where appropriate. A Control may contain
multiple CustomFields, and each CustomField can be recorded only once
within a given Control (§7).

No additional CustomField types/constraints are assumed. The current
structure is considered sufficient for this stage, not final/immutable
forever.

**Explicitly unresolved (do not implement beyond the `name` /
`description` / `unit` / `magnitude` structure above):**

- The exact value representation of a CustomField (how an actual recorded
  value is stored/typed).
- The relationship between `magnitude` and `unit`.
- The exact value types allowed.
- How CustomField _definitions_ are associated with Procedure Types,
  Surgeries, and Controls (i.e. where a CustomField is defined vs. where
  it is filled in).

These remain out of implementation scope until explicitly resolved.

---

## 10. Residents (confirmed)

- Optional; a physician may have zero or more.
- A physician may act as their own resident.
- Belongs exclusively to one Physician/Tenant.
- Uses the shared person shape (§1a) — no `observations` field.
- Created and managed by the Physician.
- **Assigned directly to a Surgery** (never to a Patient — there is no
  Resident ↔ Patient relationship; see §1b). A Surgery may have zero or
  more assigned/participating Residents.
- A Resident may be assigned to (participate in) multiple Surgeries,
  across the same or different Patients. Assignment to one Surgery has no
  bearing on any other Surgery, even for the same Patient.
- **Removal rule:** a resident assigned to a Surgery who has not recorded
  any Control for that Surgery may be removed from it.
- **Participation-preservation rule:** once a resident has recorded a
  Control for a Surgery, their participation in that Surgery must be
  preserved and cannot be removed. This reflects potential
  professional/civil responsibility for that participation, not merely
  technical immutability (see §1c).
- No additional resident permission rules are assumed.

---

## 11. Research (confirmed)

A Research Study is a structured scientific study built progressively over
time, not a generic dashboard/query. It belongs exclusively to one
Physician/Tenant.

**A Research Study contains only:**

- `hypothesis` — free text
- `results` — free text
- `analysis` — free text
- `conclusion` — free text
- a universe of selected Surgeries

All four textual components are currently free text; no further structure
is assumed for them.

The Physician selects which Surgeries belong to the research universe. A
Research Study may contain Surgeries from multiple, different Patients
within the same Physician/Tenant. **There is currently no requirement
that all selected Surgeries share the same Procedure Type** — this
corrects the earlier discovery draft, which had described the universe as
surgeries "of the same Procedure Type" (see the Documentation
Consistency note below).

**Lifecycle (revised — see Amendment below):**

```
DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED
```

- **DRAFT**
  - May exist without any selected Surgery.
  - The Physician may modify all text fields.
  - The Physician may add Surgeries.
  - The Physician may remove Surgeries.
  - The Physician may delete the Research Study (deletion is only
    possible in this state).
- **IN_PROGRESS**
  - The Physician may modify all text fields.
  - The Physician may add Surgeries.
  - The Physician may remove Surgeries.
  - The Surgery universe is **not locked** in this state — it remains
    completely modifiable.
- **COMPLETED**
  - The Research Study becomes **completely non-modifiable**: the
    Physician cannot modify text, add Surgeries, remove Surgeries, or
    otherwise change the study.
  - The Physician **may transition a `COMPLETED` study back to
    `IN_PROGRESS`**. Once reopened, the study becomes fully modifiable
    again (text and universe). Completion is therefore reversible, not a
    final/locked state.

**A Research Study may only be deleted while in `DRAFT`.**

Explicitly **not** introduced: publishing, versioning, audit behavior,
immutable history, or any research locking beyond the `COMPLETED` state
itself (which is reversible).

- **Tenancy:** a research study can only operate over data (Surgeries,
  Controls) belonging to that physician's own tenant. No cross-physician
  research exists. The Platform Admin gains no access to clinical
  information through these relationships (see §3).

---

### 11a. Documentation consistency note

An earlier revision of this document described a Research Study's
universe as "surgeries of the same Procedure Type." The authoritative
product-owner decision incorporated in this round explicitly states there
is currently no such requirement — a study's universe may mix Surgeries
of different Procedure Types, as long as they belong to the same
Physician/Tenant. §11 above reflects the corrected rule; the "same
Procedure Type" requirement is retired and should not be treated as
current.

### 11b. Amendment — lifecycle simplified, COMPLETED reversible

A later revision replaced the original lifecycle description. Previously:
`IN_PROGRESS` was entered by "confirming the hypothesis" and **locked**
the Surgery universe; `COMPLETED` was entered by "confirming the
conclusion" and left the universe locked while text stayed editable. That
model is **retired**.

The current, authoritative lifecycle (§11 above) removes the
hypothesis/conclusion confirmation preconditions entirely: transitions
are plain state changes gated only by tenant ownership and current state.
The Surgery universe is never locked while the study is `DRAFT` or
`IN_PROGRESS` — only `COMPLETED` makes the study non-modifiable, and that
state is reversible via an explicit return to `IN_PROGRESS`.

---

## 12. Notifications and reminders

Intentionally **out of scope** for the current iteration. Not to be
designed, modeled, or assumed until explicitly requested in a future
iteration.

---

## 13. Temporary / evolving decisions

The following are deliberate, pragmatic simplifications while clinical
knowledge is still being gathered — not technical debt requiring
correction, and not to be "improved" preemptively:

- Surgery `metadata`
- Patient `metadata`
- Control CustomFields
- Free-text Control interpretation
- Manual Control creation (no scheduling/automation)
- Physician-defined control timing
- Custom Procedure Types
- Flexible CustomFields (name/description/unit/magnitude)

A future meeting between the product owner and a physician is expected to
provide the missing clinical knowledge (pterygium-specific measurements,
surgery-specific information, control structure, clinical interpretation,
procedure-specific requirements). That knowledge must not be invented
ahead of time.

---

## 14. Current conceptual relationships

```
Physician
  │
  ├── Residents (0..N, optional; created/managed by Physician)
  │
  └── Patients
        └── Surgeries (state = DONE; modify/delete = Physician only)
              ├── Residents participating (assigned directly by Physician;
              │     removable only before they record a Control)
              └── Controls (observations, mandatory datetime, author;
                    modify/delete = Physician only)

Platform
  └── Admin (business/platform visibility only — no clinical access)

Physician ←→ Control        : physician may perform controls directly; only physician may modify/delete any control
Research Study → Universe of Surgeries (Physician-selected, same tenant, Procedure Type NOT required to match) → their Controls/data
Procedure Type / Surgery / Control ← CustomField (controlled extensibility — value model still unresolved)
Physician → owns/manages → Procedure Type (physician-scoped, never deleted)
```

This is a conceptual sketch only — not an aggregate/entity diagram.

**There is no Resident ↔ Patient relationship of any kind.** A Resident
is assigned directly to a Surgery by the Physician; that assignment is
the only link between a Resident and a Patient's clinical record, and it
is scoped to that one Surgery. See §1b–§1c.

---

## 15. Classification still open

Known to exist conceptually; whether/how each becomes an entity, value
object, or something else is **not decided**:

- Control (exact field set beyond "observations, mandatory datetime,
  author, CustomFields" — e.g. how "who performed it" is represented)
- Surgery (attributes beyond the confirmed list; `metadata` remains
  intentionally unresolved)
- Procedure Type (exact final structure — `name`/`description`/technique is
  a current initial idea, not closed; whether technique is a fixed list,
  an open catalog, or a CustomField-driven concept is undecided)
- Patient (structure beyond confirmed attributes)
- Research Study (internal structure is now confirmed to be free-text
  hypothesis/results/analysis/conclusion — no further structure is open
  for the text fields themselves; how the Surgery universe is represented
  remains an implementation question, not a business one)
- CustomField `magnitude`/`unit` and value model — exact semantics not
  defined (§9)

---

## 16. Open business questions

- Exact Admin permissions/tooling beyond activate/deactivate and the four
  listed metrics.
- CustomField: exact value representation, the relationship between
  `magnitude` and `unit`, exact value types, and how CustomField
  definitions are associated with Procedure Types, Surgeries, and
  Controls (§9) — explicitly unresolved, not to be implemented yet.
- Pterygium-specific measurements and interpretation rules — to be
  obtained from the physician meeting.
- Surgery `metadata` — intentionally unresolved, no further definition.
- Whether the initial pterygium surgical technique list (§8) is exhaustive
  or will be extended/refined after the physician meeting.
- Exact final Procedure Type structure beyond the current initial idea.

---

## 17. Intentionally deferred product concerns

- Notifications and reminders.
- Surgery scheduling / calendar / appointment management / pre-op lifecycle.
- Additional surgery states beyond `DONE`.
- Automated/scheduled control generation or enforced control frequency.
- Research versioning, locking, publishing, or audit trail.
- Payment / subscription management for physicians.
- Authentication.
- Authorization implementation.
- File storage.
- Observability.
- CI/CD.
- Backup/recovery strategy.
- Security/audit implementation.
- Regulatory/compliance requirements.
- Frontend framework.
- Backend HTTP framework.
- Persistence model, aggregate boundaries, entity/value object
  classification, domain event strategy.

---

## 18. Domain modeling rule (carried forward)

The purpose of this phase is to discover the domain, not to force it into
technical structures. Do not assume every noun is an entity, every
relationship requires an aggregate, every action requires a domain event,
or every piece of data requires a value object. DDD modeling decisions
come after business behavior and invariants are sufficiently understood —
and, for the clinical specifics, after the physician meeting.

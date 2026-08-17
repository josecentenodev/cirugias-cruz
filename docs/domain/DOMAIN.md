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

| Actor | Scope | Notes |
|---|---|---|
| **Platform Admin** | Platform-level, cross-tenant | Product owner/operator. Not a member of any physician's tenant. Purpose is business/platform management only — never clinical data. |
| **Physician (Médico)** | Tenant owner | The tenant itself. Full control of own workspace. May act as their own resident. |
| **Resident** | Inside a physician's workspace | Optional, zero or more. Assigned to patients. |
| **Patient** | Inside a physician's workspace | Exists only within a tenant, no global identity. |

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
assign patients to residents, perform patient follow-up (controls),
communicate with patients, manage information related to their own
surgeries, and perform research over their accumulated data.

The physician may act as their own resident — residents are not required.

---

## 5. Patient (confirmed)

Belongs exclusively to one physician's tenant. Current attributes:

- first name
- last name
- phone
- email
- date of birth
- `metadata` — free-form extensibility mechanism for information useful to
  the physician that is not yet part of the formal domain model (e.g.
  insurance/health coverage, other context)
- `observations` — free-form notes that don't yet justify a structured concept

No additional mandatory attributes are assumed.

---

## 6. Surgery (confirmed, deliberately simplified)

Confirmed information:

- belongs to a Patient
- has a Procedure Type
- has a performance/realization date
- has a single state: `DONE`
- has a `metadata` mechanism for information not yet part of the formal model

Explicitly **not** part of this iteration:
- surgery scheduling
- calendar
- pre-operative lifecycle
- future/planned surgery states

No surgery-specific clinical fields are assumed beyond the above.

---

## 7. Controls (confirmed)

A **Control** is the concrete observation/measurement recorded during
postoperative follow-up.

- **Follow-up is not a domain entity.** It is the process of accumulating
  Controls over time for a surgery.
- Controls are created **manually** by the physician whenever they want to
  record an observation.
- There is no automated control scheduling, no requirement to
  auto-generate controls, and no enforced control frequency in this
  iteration — timing is determined by the physician per patient.
- Controls must support **configurable/custom information** via the
  CustomField mechanism (§9), because the exact pterygium measurements are
  not yet known.
- **Interpretation of a Control is free text** for this iteration — an
  explicit, deliberate simplification, not a placeholder for a "better"
  design. The domain should preserve room to make interpretation more
  structured later, without that structure being decided now.

---

## 8. Procedure Types (confirmed, open in detail)

- Procedure Types are customizable by the physician; not a fixed enum.
- Pterygium is the first Procedure Type.
- The physician must be able to work with multiple procedure types over time.
- Procedure Types support extension via the CustomField mechanism (§9).
- Exact structure/constraints beyond this are intentionally open.

---

## 9. Customization / CustomFields (confirmed)

The platform supports **controlled** extensibility, not an arbitrary
form-builder. The platform owns the core domain concepts (Patient, Surgery,
Control, Procedure Type, Research); the physician customizes the
information captured *within* those concepts.

CustomField structure:

- `name` — required
- `description` — optional
- `unit` — required
- `magnitude` — required

CustomFields can extend: Procedure Types, Surgeries, Controls, and other
predefined clinical concepts where appropriate.

No additional CustomField types/constraints are assumed. The current
structure is considered sufficient for this stage, not final/immutable
forever.

---

## 10. Residents (confirmed)

- Optional; a physician may have zero or more.
- A physician may act as their own resident.
- Residents are assigned to Patients (not directly to individual surgeries —
  the exact scope of a resident's participation across a patient's
  surgeries remains open).
- A patient may have one or more residents assigned.
- **Immutability rule:** once a resident has participated in a Control, or
  recorded information related to the controls of a surgery, that resident
  cannot be removed from that relevant context. Historical participation
  must be preserved.
- No additional resident permission rules are assumed.

---

## 11. Research (confirmed)

A Research Study is a structured scientific study built progressively over
time, not a generic dashboard/query.

**Lifecycle:**

```
DRAFT → IN PROGRESS → COMPLETED
```

- **DRAFT** — study created, hypothesis not yet confirmed.
- **IN PROGRESS** — physician confirms the hypothesis; study becomes active
  and accumulates a universe of surgeries of the same Procedure Type plus
  their associated controls/data.
- **COMPLETED** — physician confirms the conclusion.

A study conceptually contains: hypothesis, universe of surgeries,
controls/collected data, results, analysis, conclusion.

- The physician may modify the research as needed, including after
  completion — there is currently **no immutable/final/locked state**, no
  versioning, no publishing, no audit trail. These are not assumed.
- **Tenancy:** a research study can only operate over data belonging to
  that physician's own tenant. No cross-physician research exists.

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
Platform
  ├── Admin (business/platform visibility only)
  └── Physician / Tenant
        ├── Patient
        │     └── Surgery (state = DONE)
        │           └── Control (measurement + free-text interpretation)
        └── Resident (0..N, optional)

Resident ←→ Patient        : assignment (0..N each way)
Physician ←→ Control        : physician may record controls directly
Research Study → Universe of Surgeries (same Procedure Type, same tenant) → their Controls/data
Procedure Type / Surgery / Control ← CustomField (controlled extensibility)
```

This is a conceptual sketch only — not an aggregate/entity diagram.

---

## 15. Classification still open

Known to exist conceptually; whether/how each becomes an entity, value
object, or something else is **not decided**:

- Control (fields beyond "measurement + free-text interpretation + CustomFields")
- Surgery (attributes beyond the confirmed list)
- Procedure Type (structure beyond "customizable, supports CustomFields")
- Patient (structure beyond confirmed attributes)
- Research Study (internal structure of hypothesis/results/analysis/conclusion)
- Resident-to-Surgery relationship (assigned to patient vs. scoped per surgery)
- CustomField `magnitude`/`unit` — exact semantics/validation not defined

---

## 16. Open business questions

- Exact Admin permissions/tooling beyond activate/deactivate and the four
  listed metrics.
- Exact scope of a resident's participation: patient-wide vs. per-surgery.
- Exact semantics of CustomField `magnitude` and `unit` (are these free
  text, a controlled vocabulary, numeric-only, etc.)?
- Whether/how a research study's editability after `COMPLETED` should ever
  be constrained (currently: no constraint at all).
- Pterygium-specific measurements, control structure, and interpretation
  rules — to be obtained from the physician meeting.
- Surgery- and procedure-specific information beyond the confirmed fields.

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

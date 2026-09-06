# 0021 — Patient gains an optional, per-tenant-unique `dni`; patient search

## Status

Established (current iteration). Resolves Milestone 8.7 in
[`ROADMAP.md`](../architecture/ROADMAP.md). Does not amend an earlier ADR
— it adds an attribute the "exact final Patient structure" was always
left open on (DOMAIN.md §5 / §16).

## Context

Registering a patient captured only the shared person shape (name /
phone / email / date of birth) plus `observations` — nothing that
identifies the real person. At low volume that is fine, but the product
owner flagged that once a tenant holds many patients the same person will
be entered twice, with no way to notice or to find the existing record.

## Decision

### `dni` — an optional identity-document number on Patient

- A single **optional** `string` on `Patient` (Patient-only, next to
  `observations` — **not** added to the shared `Person` shape; Physician
  and Resident do not get it).
- Trimmed on creation; blank-after-trim is stored as **absent**.
- **No format validation.** DNIs vary in length/formatting, and the same
  field legitimately holds a passport or other document number for a
  foreign patient. A patient with **no** document is fully valid — the
  platform keeps storing minimal PII, and the physician's own prototype
  already uses a self-assigned short code rather than a national ID.

### Uniqueness — per tenant, when present, hard-rejected at registration

- Within one physician's tenant, no two patients may share a `dni`.
  Across tenants the same `dni` is unrelated (the same real person is an
  independent Patient per tenant — DOMAIN.md tenancy model, unchanged).
- Enforced in **two places**:
  - `registerPatient` (Application) does a `patientRepository.findByDni`
    check and throws a `DomainError` ("A patient with this DNI already
    exists") → surfaces as a 400 shown inline on the form.
  - A Postgres unique index `@@unique([physicianId, dni])` is the
    integrity backstop. Postgres treats `NULL`s as distinct, so any
    number of dni-less patients coexist.
- This is **not** modelled as a domain invariant on an entity. There is
  no aggregate that owns "this physician's set of patients", so the rule
  lives in the Application layer + the database — the same shape as
  `validateCustomFieldValues` (`packages/application/src/shared/`), which
  already enforces a cross-entity rule that no single aggregate can see.
- Patients are register + retrieve only (no update operation exists), so
  the check is needed only at registration.

### Patient search — server-side `?q=`

- `GET /patients` accepts an optional `?q=`. The repository filters in
  SQL: `firstName` / `lastName` / `dni` `ILIKE %q%` (case-insensitive
  `contains`), scoped to the tenant. Blank `q` is ignored (full list).
- Server-side, not a client-side filter of the whole tenant list —
  scaling with volume is the entire motivation.
- The `web` Pacientes list renders a plain `<form method="get">`; the
  page re-renders with the new `?q=` on submit (Server Component, no
  client JS). Callers that need the full list for a name lookup (surgery
  detail, research studies, patient detail) keep calling `listPatients()`
  with no argument.

## Consequences

- New: `Patient.dni`; `PatientRepository.findByDni`; `findByPhysicianId`
  gains an optional `query`; `ListPatientsInput.query`;
  `RegisterPatientInput.dni`; a Prisma column + migration
  (`20260906120000_add_patient_dni`, applied to the Railway Postgres);
  `dni` on the wire (`serializePatient`, `PatientDto`), the registration
  form, the list (a DNI column + a search box), and the detail view.

## Not decided here / explicitly out of scope

- **Fuzzy duplicate detection** on name + date of birth (a "possible
  duplicate" warning when there is no `dni`). Deferred — it needs a
  candidate-matching heuristic and a confirmation UI, and does not block
  the MVP.
- A **document-type enum** (`DNI` / `Passport` / …). One free-text field
  is enough for now; revisit only if a real reporting need appears.
- A **patient update** path — still does not exist; if one is added it
  must re-run the same `dni` uniqueness check.
- Any **cross-tenant** patient identity or de-duplication — the tenancy
  model forbids it and this ADR does not touch it.

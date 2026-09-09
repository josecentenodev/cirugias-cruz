# 0025 — Patient carries no contact PII; Patient stops sharing the Person shape

## Status

Established (current iteration). **Amends** [0009](0009-physician-is-the-tenant-shared-person-shape.md)
(the shared person shape) and touches the same Patient-structure area as
[0021](0021-patient-dni-and-search.md). Comes out of the 2026-09-09
product-owner session recorded in
[`../architecture/alignment-restructuring.md`](../architecture/alignment-restructuring.md)
§A1 and the Milestone 9 walkthrough finding **F-01**.

**Implemented — Milestone 11 WP1** (merged to `main`): `phone`/`email`
removed across Domain → Application → Infrastructure → HTTP → `web`;
`Patient` no longer composes `Person`; migration
`20260909120000_drop_patient_contact_pii` applied to the Railway
Postgres; full quality gate green.

## Context

ADR 0009 gave Physician, Resident and Patient a single shared personal
shape: `firstName`, `lastName`, `phone`, `email`, `dateOfBirth`,
`metadata?`. For a Patient the product owner's verdict on `phone` and
`email` is: **"no sirve"** — the platform never contacts a patient
(notifications/reminders are deferred, [ADR 0008](0008-notifications-payments-deferred.md)),
the fields are dead PII, and the product's stated posture is to store the
minimum (already the reasoning behind ADR 0021's optional, format-free
`dni`).

The physician asked for a **complete removal** — "no podemos dejar
registro en el código": not hidden in the UI, not a nullable column left
in place. A future reader should find no evidence Patient ever had contact
channels.

Physician `email` and Resident `phone` are **not** in scope — see
Decision.

## Decision

### `Patient.email` and `Patient.phone` are removed entirely

Removed across every layer, the same shape as ADR 0020's `magnitude`
removal and ADR 0022's `technique` removal:

- **Domain** — no `email` / `phone` attribute, getter, or `Person.create`
  validation reachable from Patient; `Patient` equality / identity helpers
  no longer reference them.
- **Application** — `RegisterPatientInput` loses both fields; patient
  read mappers stop emitting them.
- **Infrastructure** — a Prisma migration **drops** `patients.email` and
  `patients.phone`; `PrismaPatientRepository` and its round-trip tests no
  longer map them.
- **HTTP** — patient route body schemas, `PatientDto` / `serializePatient`,
  and the patient e2e tests lose both fields.
- **Web** — the two `PatientForm` inputs, the two `PatientList` columns,
  the two `PatientDetail` rows, the `messages/en.ts` keys
  (`patients.columns.phone` / `.email`), the `patients/schemas.ts`
  fields, and the `e2e/` fixtures are all removed.

No data migration of existing values — there is no production patient
data (Milestone 9's walkthrough was run 2026-09-09 with fake data only),
so the columns are simply dropped.

### Patient no longer composes the shared `Person`

Patient's personal shape becomes **its own type**, carrying only:

- `firstName` — required
- `lastName` — required
- `dateOfBirth` — required
- `dni?` — optional, per-tenant-unique (ADR 0021, unchanged)
- `observations?` — optional (unchanged)
- `metadata?` — optional (unchanged)

Whether this is a dedicated `PatientIdentity` value object or the fields
are inlined on `Patient` is an **implementation choice**, not decided here
— exactly as ADR 0009 left "a shared implementation-level base type" open.

### `Person` stays, for Physician and Resident only

`Person` remains the shared shape for **Physician and Resident**:
`firstName`, `lastName`, `phone`, `email`, `dateOfBirth`, `metadata?`,
with `phone` and `email` still required.

- **Resident keeps `phone`** (product owner, 2026-09-09). Resident login
  is by email ([ADR 0017](0017-resident-authentication-physician-issued-temporary-password.md)),
  but `phone` is retained deliberately, not by omission.
- **Physician keeps `email`** — it is the tenant identity and login
  ([ADR 0012](0012-physician-identified-by-email.md)).

## Consequences

- ADR 0009's "Physician, Resident, and Patient share a base
  personal-information shape" no longer holds — it is now
  Physician + Resident only. The tenancy model (Physician **is** the
  Tenant) is untouched.
- `Patient` construction can no longer fail on a missing phone/email;
  its required set is `firstName` + `lastName` + `dateOfBirth` (+ `id` +
  `physicianId`).
- Any duplicate-detection heuristic (ADR 0021's deferred "fuzzy match on
  name + date of birth") now has strictly fewer signals to work with —
  noted, not a blocker.

## Not decided here

- Whether Physician / Resident should also shed `phone` one day — out of
  scope; both keep it.
- `PatientIdentity` as a distinct value object vs. inlined fields — an
  implementation decision.
- Any change to `dni` or patient search (ADR 0021 stands).

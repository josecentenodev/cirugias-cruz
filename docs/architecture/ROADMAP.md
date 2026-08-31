# Project Development Roadmap

## Purpose

This is the living roadmap from the current repository state toward the
MVP. It is a planning artifact, not an implementation task list — it
records _what_ the approved plan is and _where the project currently
stands against it_, not _how_ to build any given piece.

It should be consulted before starting any new implementation work, and
updated as milestones progress (see Roadmap Maintenance Rules below). When
implementation reveals that an assumption here was wrong, this document
gets corrected — it is not meant to be treated as fixed once written.

---

## Current State

### Completed

- **Domain discovery** — `docs/domain/DOMAIN.md` plus 12 ADRs in
  `docs/decisions/` cover tenancy, actors, Physician email-based
  identification (ADR 0012), and the confirmed business rules for
  Patient, Resident, Surgery, Control, ProcedureType, and ResearchStudy.
- **Domain model** — implemented in `packages/domain`, framework/
  infrastructure-independent, covering every currently-confirmed rule.
- **Domain tests** — verified passing, covering the confirmed invariants
  (tenant ownership, Surgery/Control participation rules, ResearchStudy
  lifecycle, ProcedureType's no-deletion rule, etc.).
- **Application Layer architecture** — discovered and approved; recorded
  in `docs/architecture/application-layer-discovery.md`. A prior review
  found no unresolved CRITICAL/HIGH/MEDIUM issues against it. §7 of that
  document records why `Surgery.reconstitute` (added in Milestone 2) is
  hydration, not a change to the Surgery/Control aggregate boundary.
- **Repository quality tooling** — lint, format, typecheck, and test are
  wired at the workspace level and verified working together.
- **Infrastructure (Milestone 2)** — `packages/infrastructure` with a
  Prisma/PostgreSQL schema for Physician/Patient/ProcedureType/Surgery/
  Control and real repository implementations for `PatientRepository`,
  `ProcedureTypeRepository`, and `SurgeryRepository`, proven against a
  real Railway-hosted Postgres instance. See Milestone 2's entry below.
- **HTTP + authentication (Milestone 3)** — `packages/http` (Fastify),
  email + password authentication with PostgreSQL-backed server-side
  sessions (no JWT/Redis/external IdP), and `registerPhysician`/`login`/
  `logout` in `packages/application`. Every MVP-required capability is
  now reachable end-to-end. See Milestone 3's entry below.

### Partially completed

- **Application Layer implementation** — the approved pattern (ports
  defined in Application, plain factory-function operations, no
  `*UseCase` classes) now covers every MVP-required operation: registering
  a Patient, a Procedure Type, a Surgery, and a Physician; recording and
  modifying a Control; authenticating and logging out; assigning a
  Resident to a Surgery; and adding a Surgery to a Research Study's
  universe (Milestones 1 and 3, completed). Still missing: removing a
  Resident from a Surgery, and the rest of the Research Study lifecycle —
  both intentionally out of scope through Milestone 3, Post-MVP per the
  MVP Definition below.

### Not started

- Frontend.
- CI/CD.
- Railway deployment wiring (the platform choice itself is decided and
  documented — see "Hosting platform" below; only the actual service
  configuration/deploy wiring remains not started).
- Platform Admin (no domain or application representation exists yet).

### Hosting platform

**Railway is the confirmed, permanent hosting platform for this
project** — not an open option. See `README.md`'s "🚂 Railway" section
for the full topology (shared monorepo, per-service build/start
commands, PostgreSQL as a Railway-managed service, migrations via the
Pre-Deploy Command). Milestone 2's persistence work was verified against
a real Postgres instance provisioned on this same Railway project. Only
the _deployment wiring itself_ (see "Not started" above) remains
outstanding — the platform decision is not.

### Explicitly deferred

- CustomField value model, unit/magnitude semantics, and how CustomField
  definitions attach to Procedure Types/Surgeries/Controls.
- Pterygium-specific clinical measurements and interpretation rules.
- Notifications/reminders.
- Payments/subscriptions.
- Surgery scheduling/calendar concepts.
- Research Study locking, versioning, publishing, or audit behavior.
- `PrismaSurgeryRepository.save()`'s participant-persistence concurrency
  risk (see Risks and Unknowns below) — deferred until a concrete
  multi-writer/concurrent-editing requirement exists, not before.

### Unknown / open

- Frontend framework choice.
- Whether Resident-related capabilities are required for the first MVP
  release, or can follow it.
- Whether Research Study is required for the first MVP release, or can
  follow it.
- CI/CD, security/audit, and regulatory-compliance timing relative to
  when real (non-test) clinical data first exists.

---

## MVP Definition

### MVP-required

- Register a Patient, within the acting physician's tenant.
- Register a Procedure Type (at minimum, create pterygium as the
  physician's first one).
- Register a completed Surgery for a Patient + Procedure Type.
- Record a Control (observation, datetime, author) against a Surgery —
  this is the capability DOMAIN.md itself names as the product's core
  purpose.
- Modify a Control (correcting an entry).
- A minimal persistence layer (Prisma + PostgreSQL) backing the above.
- A minimal reachable surface (some HTTP layer + some authentication) so
  the above is actually usable by a physician rather than only existing
  as library code.

### Post-MVP

- Resident registration, and Surgery-level assignment/removal beyond what
  is already implemented.
- Research Study — the entire capability (create, edit its text fields,
  manage its Surgery universe beyond what's implemented, and its full
  lifecycle).
- Surgery/Control modification beyond the basic correction case, and
  delete operations generally.
- Platform Admin.
- Observability, CI/CD hardening, file storage, notifications, payments.

### Unknown / blocked by discovery

- **CustomField / structured clinical measurements** — blocked by product/
  clinical discovery (ADR 0005 explicitly defers the value model pending
  a physician consultation).
- **Exact pterygium clinical measurements and interpretation rules** —
  same block; not to be guessed.
- **Whether Resident workflows belong in MVP** — depends on whether the
  first target users are solo physicians or physicians who already work
  with residents; no repository evidence resolves this either way.
- **Frontend framework** — still explicitly left open. (HTTP framework
  and authentication approach are resolved — Fastify, email + password
  with server-side sessions — and implemented; see Milestone 3.)

---

## Capability Map

| Capability                                                                                 | Domain | Application                             | Persistence | API | E2E | Overall status                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------ | ------ | --------------------------------------- | ----------- | --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Register Patient                                                                           | ✅     | ✅                                      | ✅          | ✅  | ✅  | End-to-end complete (real HTTP, real auth, real Postgres)                                                                                                                                                                                                                                                                                    |
| Register Procedure Type                                                                    | ✅     | ✅                                      | ✅          | ✅  | ✅  | End-to-end complete (real HTTP, real auth, real Postgres)                                                                                                                                                                                                                                                                                    |
| Register Surgery                                                                           | ✅     | ✅                                      | ✅          | ✅  | ✅  | End-to-end complete (real HTTP, real auth, real Postgres)                                                                                                                                                                                                                                                                                    |
| Record Control                                                                             | ✅     | ✅                                      | ✅          | ✅  | ✅  | End-to-end complete (real HTTP, real auth, real Postgres)                                                                                                                                                                                                                                                                                    |
| Modify Control                                                                             | ✅     | ✅                                      | ✅          | ✅  | ✅  | End-to-end complete (real HTTP, real auth, real Postgres)                                                                                                                                                                                                                                                                                    |
| Physician registration + authentication (email + password, server-side session)            | N/A    | ✅                                      | ✅          | ✅  | ✅  | End-to-end complete — `registerPhysician`/`login`/`logout`, `packages/http` routes `/physicians`, `/sessions`; see ADR 0012                                                                                                                                                                                                                  |
| Assign Resident to Surgery                                                                 | ✅     | ✅                                      | ⚠️          | ❌  | ❌  | Uses the same real `SurgeryRepository` as the rows above (its participant-persistence path is covered by `PrismaSurgeryRepository`'s own round-trip tests), but the `assignResidentToSurgery` operation itself was not independently run against real persistence — it was outside Milestone 2's scope, so this is not yet claimed as proven |
| Remove Resident from Surgery                                                               | ✅     | ❌                                      | ❌          | ❌  | ❌  | Not started at Application layer                                                                                                                                                                                                                                                                                                             |
| Add Surgery to Research Study                                                              | ✅     | ✅                                      | ❌          | ❌  | ❌  | Application complete; blocked below that layer                                                                                                                                                                                                                                                                                               |
| Research Study lifecycle (create, edit text, remove surgery, move/complete/reopen, delete) | ✅     | ❌ (one of ~8 methods has an operation) | ❌          | ❌  | ❌  | Mostly not started at Application layer                                                                                                                                                                                                                                                                                                      |
| Platform Admin visibility                                                                  | ❌     | ❌                                      | ❌          | ❌  | ❌  | Not started at any layer                                                                                                                                                                                                                                                                                                                     |

Every MVP-required capability is now End-to-end complete: real HTTP
(Fastify), real email+password authentication with a server-side session
(PostgreSQL-backed), real Prisma/PostgreSQL persistence, all proven
against a real Railway-hosted Postgres instance (Milestones 1–3). Remove
Resident from Surgery and the rest of the Research Study lifecycle remain
Post-MVP per the MVP Definition above and were intentionally left out of
all three milestones' scope.

---

## Milestones

### Milestone 1 — Complete the core clinical Application capability set

**Objective**: every Application operation needed to register a patient,
register a surgery, and record/correct a postoperative Control exists,
tested against fakes, following the pattern already proven by the two
existing operations.

**Why it exists**: this is the actual product-critical gap. The
Application layer currently proves its own pattern works but does not yet
implement the product's core value (postoperative follow-up).

**Prerequisites**: none — Domain and the Application pattern are both
ready as-is.

**Scope**: `registerPatient`, `registerProcedureType`, `registerSurgery`,
`recordControl`, `modifyControl`, plus the two new ports these require
(`PatientRepository`, `ProcedureTypeRepository`).

**Explicitly out of scope**: Resident assignment/removal beyond what
exists; Research Study beyond what exists; CustomField in any form;
anything below the Application layer (no Prisma, no HTTP).

**Deliverables**: new operation files under `packages/application/src`
for the capabilities listed in Scope, following the existing
factory-function pattern and the existing fakes-based test style.

**Definition of Done**: the full workspace quality gate (lint,
format-check, typecheck, test) passes with these additions; every new
operation has tests covering its happy path, its relevant not-found
case(s), and the one tenant-boundary case genuinely applicable to it.

**Completion criteria**: every "MVP-required" row in the Capability Map
above shows Application = ✅.

**Dependencies**: none.

**Status**: `COMPLETED` — `registerPatient`, `registerProcedureType`,
`registerSurgery`, `recordControl`, and `modifyControl` are implemented
under `packages/application/src`, each following the existing
factory-function pattern, with `PatientRepository` and
`ProcedureTypeRepository` ports added. The full workspace quality gate
(lint, format-check, typecheck, test) passes: 79 Domain tests + 30
Application tests, all green. One genuine cross-aggregate gap was found
and closed along the way: `Surgery.recordControl`'s resident-authored
branch has no parameter for the acting caller's tenant at all (only the
physician-authored branch is tenant-checked inside the Domain method), so
`recordControl` explicitly verifies `surgery.physicianId === physicianId`
for every authorship branch before delegating — documented in the
operation's own code comment, not a Domain change.

---

### Milestone 2 — Real persistence for the core loop

**Objective**: `PatientRepository`, `ProcedureTypeRepository`, and
`SurgeryRepository` have real, Prisma/PostgreSQL-backed implementations,
proven against the operations built in Milestone 1.

**Why it exists**: validates the aggregate-to-schema mapping assumption —
particularly Surgery owning Control as an internal entity — against a
real database. Nothing has tested this assumption yet.

**Prerequisites**: Milestone 1 completed, so a persistence bug can be
isolated from an orchestration bug.

**Scope**: a Prisma schema for Physician, Patient, ProcedureType, Surgery,
and Control only; real implementations of the three repositories;
infrastructure-level tests proving save-then-find round-trips correctly.

**Explicitly out of scope**: Research Study / Resident persistence;
Railway-specific deployment wiring (a separate deploy concern); HTTP.

**Deliverables**: a new `packages/infrastructure` package; a Prisma
schema; repository implementation classes; infrastructure tests.

**Definition of Done**: the Milestone 1 operations, run against the real
repository implementations instead of fakes, produce identical
externally-observable results; the workspace quality gate remains green
with the new package included.

**Completion criteria**: zero fakes remain in the code path exercised by
the Milestone 1 operations (fakes may remain for not-yet-built
capabilities).

**Dependencies**: Milestone 1.

**Status**: `COMPLETED` — `packages/infrastructure` was added with a Prisma
schema covering exactly Physician/Patient/ProcedureType/Surgery/Control
(plus a `SurgeryParticipant` join table for `participatingResidentIds`,
with no FK to a `Resident` table — Resident persistence stayed out of
scope). `PrismaPatientRepository`, `PrismaProcedureTypeRepository`, and
`PrismaSurgeryRepository` implement the existing Application ports with
no changes to those ports. `Surgery.reconstitute(...)` was added to
`packages/domain` as the one narrow addition this milestone required —
Surgery's private constructor and `create()` had no way to rehydrate
pre-existing Controls/participant ids from storage; `reconstitute()` does
that without re-running creation-only validation, and without introducing
a generic reconstruction framework. All five Milestone 1 operations
(`registerPatient`, `registerProcedureType`, `registerSurgery`,
`recordControl`, `modifyControl`) were run against the real repositories
— no fakes — in
`packages/infrastructure/src/integration/milestone-1-operations.test.ts`,
against a real Postgres instance provisioned on Railway (project
`cirugias-cruz`, service `Postgres`), with matching repository-level
round-trip tests proving Control persistence, `participatingResidentIds`
persistence/reconstitution, in-place Control updates, and `createdAt`
stability / `updatedAt` advancement. 17 new infra tests pass; the full
workspace quality gate (lint, format-check, typecheck, test — 80 Domain +
30 Application + 17 Infrastructure tests) is green. Two implementation
decisions were made beyond the original discovery pass and are recorded
here rather than left implicit: (1) `physicians` rows are seeded directly
via the Prisma client in test fixtures — there is still no
`PhysicianRepository`/`registerPhysician` operation anywhere, and the FK
from Patient/ProcedureType/Surgery to Physician is enforced at the schema
level on that basis; (2) `Control` upserts on `save()` are insert-or-update
by id with no delete-sync, since no Application operation removes a
Control from a loaded Surgery in this milestone's scope.

---

### Milestone 3 — Minimal reachable surface (HTTP + auth)

**Objective**: a physician (or a test client acting as one) can invoke
register-patient → register-surgery → record-control over the network,
authenticated as themselves.

**Why it exists**: "MVP ready to go to market" requires something
reachable by an actual user; everything before this point is invisible
outside test code.

**Prerequisites**: Milestones 1 and 2 completed — satisfied. Also
requires: (a) the HTTP framework and authentication mechanism to be
decided (see Planning Decisions Requiring Approval — narrowed but not
resolved by ADR 0012); (b) a real Physician-creation path, which does not
exist yet at any layer — per ADR 0012, this means a `registerPhysician`
Application operation (same factory-function pattern as
`registerPatient`/`registerProcedureType`) and a `PhysicianRepository`
port + Prisma-backed implementation (same pattern as Milestone 2's other
three repositories). Neither is large, but neither is built, and "a
physician can invoke the core loop authenticated as themselves" is not
meaningful until a real Physician can exist outside a test fixture.

**Scope**: whichever minimal HTTP framework is chosen, wired only to the
Milestone 1 operations; whichever minimal authentication mechanism is
chosen, sufficient to make the acting physician's identity — resolved via
their `email` per ADR 0012 — a verified claim rather than a trusted
input; the `registerPhysician` operation and `PhysicianRepository`
prerequisite described above.

**Explicitly out of scope**: a full CRUD surface for every entity;
Research Study or Resident endpoints; any UI.

**Deliverables**: an API application package; a small set of routes for
the Milestone 1 operations; authentication wiring.

**Definition of Done**: an end-to-end test — real HTTP call, real
authentication, real database — can register a patient, register a
surgery, and record a control for one physician, and cannot perform any
of those actions under a different physician's identity.

**Completion criteria**: at least one passing end-to-end test exercising
the full stack for the core loop.

**Dependencies**: Milestones 1 and 2 (both satisfied), plus the
HTTP-framework and authentication-mechanism decisions, plus building the
`registerPhysician` operation and `PhysicianRepository` port ADR 0012
requires.

**Status**: `COMPLETED` — the HTTP-framework (Fastify) and
authentication-mechanism (email + password, server-side sessions in
PostgreSQL, no JWT/Redis/external IdP) decisions were approved, and the
implementation followed. `packages/http` was added: `POST /physicians`
(registration), `POST /sessions` (login, sets an httpOnly/sameSite=lax
session cookie), `DELETE /sessions` (logout), and the five Milestone 1
operations wired behind a `requireAuth` preHandler that resolves the
session cookie to a physicianId — never trusting a client-supplied one.
`registerPhysician`, `login`, and `logout` were added to
`packages/application` (factory-function pattern, unchanged from
Milestones 1–2), backed by two new ports — `PhysicianRepository` (pure
Domain-shaped, mirrors Patient/ProcedureType) and
`PhysicianCredentialRepository` (email + password hash, deliberately
separate from `Physician` — see ADR 0012) — plus a narrow
`PasswordHasher` port and a `SessionRepository` port. Infrastructure
implementations (`PrismaPhysicianRepository`,
`PrismaPhysicianCredentialRepository`, `PrismaSessionRepository`,
`BcryptPasswordHasher`) were added to `packages/infrastructure`, with
`PhysicianCredential`/`Session` models added to the Prisma schema
(`emailNormalized` unique index enforcing case-insensitive email
uniqueness without requiring the `citext` extension). An end-to-end test
— real HTTP via Fastify's `inject()`, real bcrypt hashing, a real session
cookie, real Postgres — registers a physician, logs in, registers a
patient/procedure type/surgery, records and modifies a control, and
confirms a second physician's session cannot act on the first physician's
surgery (400, tenant check unchanged from Milestones 1–2). 8 new HTTP
tests + 9 new Infrastructure tests + 10 new Application tests, all
passing; full workspace quality gate green (80 Domain + 40 Application +
31 Infrastructure + 8 HTTP tests).

---

### Milestone 4 — Resident and Research capabilities

**Objective**: complete the remaining Application operations (Resident
registration/removal beyond what exists, the full Research Study
lifecycle) and their persistence/HTTP surfaces.

**Why it exists**: valuable capabilities, but their necessity for the
first release depends on a product decision that hasn't been made (see
Planning Decisions Requiring Approval), and Research Study specifically
depends on the core loop already having produced data worth studying.

**Prerequisites**: Milestones 1–3, plus resolution of whether
Resident/Research capabilities are in-scope for the first release.

**Scope, Deliverables, Definition of Done**: intentionally not detailed
further here — its necessity is an open product question, not yet an
approved scope, so specifying implementation detail now would be
premature.

**Dependencies**: Milestones 1–3, plus a product decision.

**Status**: `DEFERRED`

---

## Dependency Graph

```
Milestone 1 (Application: core loop operations)
     │
     ├──▶ Milestone 2 (Infrastructure: real persistence for core loop)
     │         │
     │         ▼
     │    Milestone 3 (HTTP + auth for core loop) — COMPLETED
     │
     └──▶ Milestone 4 (Resident + Research)
               — the Application-operation portion is parallelizable with
                 Milestone 2/3 (it needs only Domain + fakes, same as
                 Milestone 1 did)
               — the persistence/HTTP portion is blocked behind
                 Milestone 2/3's infrastructure once it exists
               — overall milestone start is additionally blocked on a
                 product decision (Resident/Research in MVP or not)
```

**Sequential**: Milestone 1 → Milestone 2 → Milestone 3. Each validates an
assumption the next depends on (orchestration correctness → persistence
correctness → reachability).

**Parallelizable**: the Application-operation half of Milestone 4 can
proceed alongside Milestone 2/3, since it depends on nothing they
provide.

**Blocked**: Milestone 3 (on the HTTP/auth decisions); Milestone 4 (on
the Resident/Research-in-MVP product decision, and structurally on
Milestone 2/3's infrastructure for anything beyond its Application-layer
half).

**Deferred, not scheduled**: CustomField/clinical measurements
(blocked on physician consultation), notifications, payments, Platform
Admin, observability, CI/CD hardening, file storage, backup/recovery
strategy, security/regulatory work.

---

## Progress Measurement

Progress is measured by capability state, not by files, lines of code,
commits, or token usage. For a given capability:

- **Not started** — no Application-layer operation exists for it, even if
  the underlying Domain behavior does.
- **In progress** — an Application-layer operation exists and is tested
  against fakes, but no real persistence or reachable surface exists yet.
- **Technically complete** — a real (non-fake) persistence implementation
  exists and is proven for the capability, but it is not yet reachable
  through any API.
- **End-to-end complete** — the capability is reachable through a real
  API call, authenticated, against real persistence, with at least one
  passing end-to-end test proving it.

A capability is never considered complete merely because Domain or
Application code exists for it. As of Milestone 2, the five
Milestone-1-scoped capabilities (Register Patient/Procedure
Type/Surgery, Record/Modify Control) reached "End-to-end complete" with
Milestone 3: each is reachable through a real, authenticated HTTP call
against real persistence, proven by the e2e tests in `packages/http`.
Every other capability in the Capability Map above remains at most "in
progress."

---

## Current Milestone

> **CURRENT MILESTONE: none — Milestones 1–3 are complete; Milestone 4 is deferred pending a product decision**

Milestones 1, 2, and 3 are complete (see their entries above and
Historical Progress below). There is no milestone actively in progress.
Do not begin Milestone 4 implementation — see its entry above and "Next
Milestone" below for what's still blocking it.

---

## Next Milestone

**Milestone 4 — Resident and Research capabilities.** Status remains
`DEFERRED`. It is not blocked on any technical decision — the
Application-operation half needs only Domain + fakes, same as Milestones
1–3 — but its necessity for the first release depends on a product
decision that hasn't been made (see Planning Decisions Requiring Approval
items 1–2: whether Resident workflows and/or Research Study must ship in
the first release). Do not start it without that decision, and do not
treat "Milestones 1–3 are done" as implicit authorization to begin it.

---

## Risks and Unknowns

- Milestone 1 closed the gap where Application operations did not cover
  the Domain's own stated core purpose (postoperative follow-up /
  `recordControl`) — a real, evidence-based gap, not a stylistic
  observation.
- Infrastructure now exists (Milestone 2, real Prisma/PostgreSQL
  repositories for Patient/ProcedureType/Surgery) — but HTTP, frontend,
  CI, and deployment wiring still do not exist at all; any planning that
  assumes those are "mostly done" would be incorrect.
- Two Application-level tenant checks were required beyond what Domain
  enforces on its own, because the affected Domain methods have no
  parameter to check the relevant tenant themselves: `registerSurgery`
  verifying the referenced Patient/ProcedureType belong to the acting
  physician (mirroring the Resident/Surgery gap documented in
  `docs/architecture/application-layer-discovery.md` §4.3), and
  `recordControl` verifying the surgery itself belongs to the acting
  physician for every authorship branch (since `Surgery.recordControl`'s
  resident-authored branch has no tenant parameter at all). Both are now
  implemented and tested — recorded here as a pattern to watch for in
  future milestones, not as an open risk.
- **`PrismaSurgeryRepository.save()` participant-persistence lost-update
  risk (deferred, not a Milestone 2 defect).** `save()` replaces the
  persisted `SurgeryParticipant` rows with `deleteMany` + `createMany`
  based on the in-memory `participatingResidentIds` set at save time,
  rather than an incremental diff. Two concurrent `save()` calls against
  the same Surgery, each working from its own stale snapshot, could have
  the second save's full replace silently drop a participant the first
  save added. Identified during the Milestone 2 post-implementation
  review (`docs/architecture/application-layer-discovery.md` was
  considered as a location for this too, but it belongs here — it is a
  persistence-implementation risk, not aggregate-boundary reasoning).
  **Explicitly deferred**: no optimistic locking, version column, or
  participant-diffing logic should be introduced until the project has a
  concrete multi-writer/concurrent-editing requirement (e.g. a resident
  and physician editing the same Surgery from separate devices at
  overlapping times) — there is no such requirement today.
- Whether Resident-related capabilities belong in the first MVP release
  is unresolved; no repository evidence answers it either way.
- CustomField's value model remains blocked on a physician consultation
  (ADR 0005) and cannot be scheduled into any milestone until that input
  exists.
- HTTP framework and authentication mechanism were resolved (Fastify;
  email + password with PostgreSQL-backed server-side sessions) and
  implemented in Milestone 3 — no longer an open risk.

---

## Planning Decisions Requiring Approval

1. **Is a solo physician (no residents) a sufficient first release, or
   must Resident workflows ship in it?** Determines whether Milestone 4's
   Resident half moves into MVP scope or stays deferred.
2. **Does the first release need Research Study at all, or is
   register-surgeries-and-record-follow-up alone sufficient to validate
   the product?** DOMAIN.md frames research as a core purpose, but it
   operates over data the core loop hasn't produced yet — this is a
   sequencing/scope decision, not something inferable from the repository.
3. ~~HTTP framework and the authentication mechanism.~~ **Resolved**:
   Fastify; email + password with PostgreSQL-backed server-side sessions.
   Implemented in Milestone 3.
4. **Whether CI/CD, security/audit, and regulatory-compliance work must
   land before any real (non-test) physician or patient data is stored.**
   A risk-tolerance decision, not inferable from the repository alone.

When any of these is explicitly approved, update the relevant section of
this roadmap (MVP Definition, the affected milestone's Status/scope)
rather than leaving the resolved question listed here as still open.

---

## Roadmap Maintenance Rules

1. Before starting a new milestone, read this roadmap and verify the
   current milestone.
2. Do not begin work on a future milestone unless its prerequisites are
   satisfied or explicitly approved.
3. When a milestone begins, change its status to `IN_PROGRESS`.
4. When work is blocked, record the blocker and change the status to
   `BLOCKED`.
5. When a milestone satisfies its Definition of Done, change it to
   `COMPLETED`.
6. Update the Capability Map when a meaningful capability changes state.
7. Update the roadmap when implementation reveals that an assumption,
   dependency, or milestone is incorrect.
8. Do not silently change MVP scope. Any meaningful scope change must be
   explicitly identified for review.
9. Do not add speculative milestones merely because they are common in
   software projects.
10. Keep this document concise enough that an agent can reliably use it
    as planning context before starting work.
11. The roadmap is a planning artifact, not an implementation task list.
12. Detailed implementation decisions belong in the appropriate
    architecture documentation, ADRs, or code — not in this roadmap.

---

## Historical Progress

| Milestone                                                           | Status    | Completion evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Milestone 1 — Complete the core clinical Application capability set | COMPLETED | `registerPatient`, `registerProcedureType`, `registerSurgery`, `recordControl`, `modifyControl` implemented in `packages/application/src`; 79 Domain + 30 Application tests passing; full workspace quality gate (lint, format-check, typecheck, test) green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Milestone 2 — Real persistence for the core loop                    | COMPLETED | `packages/infrastructure` added with a Prisma schema for Physician/Patient/ProcedureType/Surgery/Control (+ `SurgeryParticipant`, no Resident table); `PrismaPatientRepository`/`PrismaProcedureTypeRepository`/`PrismaSurgeryRepository` implement the existing Application ports unchanged; `Surgery.reconstitute(...)` added to Domain as the sole hydration mechanism; all five Milestone 1 operations run against real repositories (no fakes) and pass against a real Postgres instance on Railway; 80 Domain + 30 Application + 17 Infrastructure tests passing; full workspace quality gate green                                                                                                                                                                                                                                                                                                                                                                                                 |
| Milestone 3 — Minimal reachable surface (HTTP + auth)               | COMPLETED | `packages/http` (Fastify) added with `POST /physicians`, `POST /sessions`, `DELETE /sessions`, and the five Milestone 1 operations behind a `requireAuth` preHandler resolving physicianId only from the session cookie; `registerPhysician`/`login`/`logout` added to `packages/application` with `PhysicianRepository`/`PhysicianCredentialRepository`/`PasswordHasher`/`SessionRepository` ports; `PrismaPhysicianRepository`/`PrismaPhysicianCredentialRepository`/`PrismaSessionRepository`/`BcryptPasswordHasher` added to `packages/infrastructure`; `PhysicianCredential`/`Session` Prisma models added (case-insensitive email uniqueness via a normalized unique index, no `citext`); e2e tests (real HTTP, real bcrypt, real session cookie, real Postgres) cover registration, login success/failure, session expiry, logout, unauthenticated rejection, and cross-tenant rejection; 80 Domain + 40 Application + 31 Infrastructure + 8 HTTP tests passing; full workspace quality gate green |

# Project Development Roadmap

## Purpose

This is the living roadmap from the current repository state toward the
MVP. It is a planning artifact, not an implementation task list — it
records *what* the approved plan is and *where the project currently
stands against it*, not *how* to build any given piece.

It should be consulted before starting any new implementation work, and
updated as milestones progress (see Roadmap Maintenance Rules below). When
implementation reveals that an assumption here was wrong, this document
gets corrected — it is not meant to be treated as fixed once written.

---

## Current State

### Completed

- **Domain discovery** — `docs/domain/DOMAIN.md` plus 11 ADRs in
  `docs/decisions/` cover tenancy, actors, and the confirmed business
  rules for Patient, Resident, Surgery, Control, ProcedureType, and
  ResearchStudy.
- **Domain model** — implemented in `packages/domain`, framework/
  infrastructure-independent, covering every currently-confirmed rule.
- **Domain tests** — verified passing, covering the confirmed invariants
  (tenant ownership, Surgery/Control participation rules, ResearchStudy
  lifecycle, ProcedureType's no-deletion rule, etc.).
- **Application Layer architecture** — discovered and approved; recorded
  in `docs/architecture/application-layer-discovery.md`. A prior review
  found no unresolved CRITICAL/HIGH/MEDIUM issues against it.
- **Repository quality tooling** — lint, format, typecheck, and test are
  wired at the workspace level and verified working together.

### Partially completed

- **Application Layer implementation** — the approved pattern (ports
  defined in Application, plain factory-function operations, no
  `*UseCase` classes) is implemented and proven for exactly two
  operations: assigning a Resident to a Surgery, and adding a Surgery to
  a Research Study's universe. The remaining operations the Domain
  already supports — registering a Patient, a Procedure Type, or a
  Surgery; recording or modifying a Control; the rest of the Research
  Study lifecycle — do not yet have an Application-layer operation.

### Not started

- Infrastructure (Prisma schema, real repository implementations,
  PostgreSQL wiring).
- HTTP/API layer.
- Frontend.
- CI/CD.
- Railway deployment configuration.
- Authentication implementation.
- Platform Admin (no domain or application representation exists yet).

### Explicitly deferred

- CustomField value model, unit/magnitude semantics, and how CustomField
  definitions attach to Procedure Types/Surgeries/Controls.
- Pterygium-specific clinical measurements and interpretation rules.
- Notifications/reminders.
- Payments/subscriptions.
- Surgery scheduling/calendar concepts.
- Research Study locking, versioning, publishing, or audit behavior.

### Unknown / open

- HTTP framework choice.
- Frontend framework choice.
- Authentication approach.
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
- **HTTP framework, frontend framework, authentication approach** — all
  explicitly left open in the project's own documentation.

---

## Capability Map

| Capability | Domain | Application | Persistence | API | E2E | Overall status |
|---|---|---|---|---|---|---|
| Register Patient | ✅ | ❌ | ❌ | ❌ | ❌ | Not started at Application layer |
| Register Procedure Type | ✅ | ❌ | ❌ | ❌ | ❌ | Not started at Application layer |
| Register Surgery | ✅ | ❌ | ❌ | ❌ | ❌ | Not started at Application layer |
| Record Control | ✅ | ❌ | ❌ | ❌ | ❌ | Not started at Application layer — highest-priority gap |
| Modify Control | ✅ | ❌ | ❌ | ❌ | ❌ | Not started at Application layer |
| Assign Resident to Surgery | ✅ | ✅ | ❌ | ❌ | ❌ | Application complete; blocked below that layer |
| Remove Resident from Surgery | ✅ | ❌ | ❌ | ❌ | ❌ | Not started at Application layer |
| Add Surgery to Research Study | ✅ | ✅ | ❌ | ❌ | ❌ | Application complete; blocked below that layer |
| Research Study lifecycle (create, edit text, remove surgery, move/complete/reopen, delete) | ✅ | ❌ (one of ~8 methods has an operation) | ❌ | ❌ | ❌ | Mostly not started at Application layer |
| Platform Admin visibility | ❌ | ❌ | ❌ | ❌ | ❌ | Not started at any layer |

No capability has reached Persistence yet. The two capabilities furthest
along (Resident assignment, Research Study surgery addition) were chosen
to prove the Application pattern works, not because they are the most
product-critical — the product-critical capabilities (register a Surgery,
record a Control) are currently the least started.

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

**Status**: `NOT_STARTED`

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

**Status**: `NOT_STARTED`

---

### Milestone 3 — Minimal reachable surface (HTTP + auth)

**Objective**: a physician (or a test client acting as one) can invoke
register-patient → register-surgery → record-control over the network,
authenticated as themselves.

**Why it exists**: "MVP ready to go to market" requires something
reachable by an actual user; everything before this point is invisible
outside test code.

**Prerequisites**: Milestones 1 and 2 completed. Also requires the HTTP
framework and authentication approach to be decided — both currently
open (see Planning Decisions Requiring Approval).

**Scope**: whichever minimal HTTP framework is chosen, wired only to the
Milestone 1 operations; whichever minimal authentication approach is
chosen, sufficient to make the acting physician's identity a verified
claim rather than a trusted input.

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

**Dependencies**: Milestones 1 and 2, plus the HTTP-framework and
authentication decisions.

**Status**: `BLOCKED` — blocked on the HTTP-framework and authentication
decisions listed under Planning Decisions Requiring Approval.

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
     │    Milestone 3 (HTTP + auth for core loop)
     │         ▲
     │         └── blocked on: HTTP framework decision, authentication approach decision
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
Application code exists for it — see the Capability Map above, where
every current capability is at most "in progress" by this definition.

---

## Current Milestone

> **CURRENT MILESTONE: Milestone 1 — Complete the core clinical Application capability set**

- **Objective**: implement the Application-layer operations for
  registering a Patient, a Procedure Type, and a Surgery, and for
  recording/modifying a Control — closing the gap between what the Domain
  already supports and what the Application layer currently exposes.
- **Scope**: `registerPatient`, `registerProcedureType`,
  `registerSurgery`, `recordControl`, `modifyControl`, plus the
  `PatientRepository` and `ProcedureTypeRepository` ports they require.
- **Prerequisites**: none.
- **Definition of Done**: the workspace quality gate (lint, format-check,
  typecheck, test) passes with these additions; every new operation has
  tests covering its happy path, its relevant not-found case(s), and the
  one tenant-boundary case genuinely applicable to it; no new Domain
  changes and no repository/abstraction beyond what's listed in Scope
  (in particular, no `ControlRepository`).
- **Completion criteria**: every "MVP-required" row in the Capability Map
  shows Application = ✅.

**Status**: `NOT_STARTED`

---

## Next Milestone

**Milestone 2 — Real persistence for the core loop.** Not to be started
until Milestone 1's Definition of Done is met.

---

## Risks and Unknowns

- The two currently-implemented Application operations do not cover the
  Domain's own stated core purpose (postoperative follow-up /
  `recordControl`) — a real, evidence-based gap, not a stylistic
  observation.
- No Infrastructure, HTTP, frontend, CI, or deployment configuration
  exists at all yet — any planning that assumes these are "mostly done"
  would be incorrect.
- `registerSurgery` will need to verify that the Patient and Procedure
  Type it's given both belong to the acting physician's tenant, because
  Domain's own `Surgery.create` only checks that the id strings are
  non-empty — this mirrors an already-identified pattern (the
  Resident/Surgery tenant-check gap documented in
  `docs/architecture/application-layer-discovery.md` §4.3) and should be
  planned for rather than discovered mid-implementation.
- Whether Resident-related capabilities belong in the first MVP release
  is unresolved; no repository evidence answers it either way.
- CustomField's value model remains blocked on a physician consultation
  (ADR 0005) and cannot be scheduled into any milestone until that input
  exists.
- HTTP framework and authentication approach are both explicitly open in
  the project's own documentation and block Milestone 3 specifically.

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
3. **HTTP framework and authentication approach.** Both explicitly
   undecided in the project's own documentation; Milestone 3 cannot be
   scoped in detail until these are chosen.
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

| Milestone | Status | Completion evidence |
|---|---|---|

_No milestones completed yet._

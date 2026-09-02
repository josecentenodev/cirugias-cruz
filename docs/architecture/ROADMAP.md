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

- **Domain discovery** — `docs/domain/DOMAIN.md` plus 14 ADRs in
  `docs/decisions/` cover tenancy, actors, Physician email-based
  identification (ADR 0012), the HTTP framework (Fastify, ADR 0013), the
  frontend framework and BFF pattern (Next.js App Router, ADR 0014), and
  the confirmed business rules for Patient, Resident, Surgery, Control,
  ProcedureType, and ResearchStudy.
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
- **Read/Query, Resident, Research, and API hardening (Milestones 4–7)**
  — implemented in parallel (separate git worktrees, merged into `main`
  in sequence) and verified together against the full workspace quality
  gate and a real Railway Postgres instance: list/get routes for
  Patient/ProcedureType/Surgery (Milestone 4); Resident registration,
  removal from a Surgery, and Resident read (Milestone 5); the full
  Research Study lifecycle — create, edit, manage its Surgery universe,
  transitions, delete, read (Milestone 6); request validation, forwarded-
  IP-keyed rate limiting, security headers, structured logging, and a
  health check on `api` (Milestone 7). See each milestone's entry below
  for full detail.
- **Railway deployment wiring** — the `cirugias-cruz` service builds and
  runs successfully on Railway from `main` (Railpack detects the pnpm
  workspace from the repo root; `deploy.startCommand` and
  `build.buildCommand` explicitly target `@cirugias-cruz/http` and
  `@cirugias-cruz/infrastructure` via `pnpm --filter`, since setting
  `source.rootDirectory` to a subpackage broke workspace detection —
  see "Hosting platform" below and `deployment-railway.md`).
  `deploy.preDeployCommand` runs `prisma migrate deploy` before each
  deploy. `DATABASE_URL` (private-network reference to the `Postgres`
  service) and `NODE_ENV=production` are set on the service. No public
  domain is attached yet — the service is only reachable on Railway's
  private network for now.

### Partially completed

- Nothing — every Application-layer capability the MVP Definition below
  requires (Milestones 1–7) is now implemented, tested, and reachable
  through authenticated HTTP against real Postgres. What remains is the
  frontend and public reachability (Milestones 8–9), not partially-built
  backend capability.

### Not started

- Frontend (`packages/web`) — technology decided (Next.js App Router,
  BFF pattern; see `docs/architecture/frontend-architecture-discovery.md`
  and Milestone 8), not yet built.
- CI/CD.
- A public domain for the `cirugias-cruz` service (it currently deploys
  and runs, but is reachable only on Railway's private network — no one
  outside the project can reach it yet).
- Platform Admin (no domain or application representation exists yet).

### Hosting platform

**Railway is the confirmed, permanent hosting platform for this
project** — not an open option. The full topology, per-service
build/start/pre-deploy commands, environment variables, and the
non-obvious gotchas (Root Directory must stay at the repo root or
Railpack's pnpm-workspace detection breaks; `tsx` must be a runtime
`dependency`; the lockfile must be regenerated in the same change) are
consolidated in
[`deployment-railway.md`](deployment-railway.md), with the config itself
versioned in `railway.api.json` / `railway.web.json` at the repo root.
The `api` service (`cirugias-cruz`) builds and deploys successfully from
`main`; `web` is not created on Railway yet (Milestone 8/9).

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

- Whether `packages/http` (`api`) should ever be reachable other than by
  `packages/web`'s own server — leans toward Railway-private-only given
  the BFF decision, but not yet a formally closed decision (affects
  Milestone 7's exact scope).
- CI/CD, security/audit, and regulatory-compliance timing relative to
  when real (non-test) clinical data first exists.
- Backup/recovery policy for the Postgres instance (plan-tier-dependent
  on Railway, not decidable from the repo).

**Resolved by explicit product decision (no longer open)**: Read/Query
capabilities, Resident, and Research are all now MVP-required; a real
physician-facing frontend is required (raw HTTP/API tooling does not
satisfy the MVP); Railway remains the fixed hosting platform, with
separate `api` (`packages/http`) and `web` (`packages/web`) services
within the same monorepo; the frontend framework is **Next.js, App
Router**, run as a **BFF** calling `api` server-to-server (not a
CORS-facing client) — see
`docs/architecture/frontend-architecture-discovery.md` for the full
reasoning and Milestone 8 for its scope.

---

## MVP Definition

> **Revised** during the post-Milestone-3 MVP replanning pass. Read/Query,
> Resident, and Research moved from "Post-MVP" to "MVP-required" by
> explicit product decision — this is a deliberate, approved scope change,
> not scope creep; see Roadmap Maintenance Rule 8.

### MVP-required

- Physician registration + authentication (done — Milestone 3).
- Register **and retrieve** a Patient, within the acting physician's
  tenant (read was missing; see Milestone 4).
- Register **and retrieve** a Procedure Type.
- Register **and retrieve** a completed Surgery for a Patient + Procedure
  Type, including its full Control history.
- Record and modify a Control against a Surgery — the capability
  DOMAIN.md itself names as the product's core purpose — and be able to
  **read it back** (implicit in retrieving the owning Surgery).
- **Resident**: register a Resident, assign/remove them on a Surgery
  (assignment already implemented), and retrieve a physician's own
  Residents. Scope is exactly what Domain already defines — no additional
  resident permission model (DOMAIN.md §10 explicitly assumes none).
- **Research Study**: create, edit its four text fields, manage its
  Surgery universe, move it through its full lifecycle
  (`DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED`), delete while DRAFT, and retrieve a
  physician's own studies. Scope is exactly what `research-study.ts`
  already implements — no versioning/publishing/audit beyond the
  approved reversible-completion model.
- A real, physician-facing web application — raw HTTP/API access does not
  satisfy "usable by a physician." **Confirmed**: Next.js App Router
  (`packages/web`), run as a BFF calling `packages/http` server-to-server
  — see `docs/architecture/frontend-architecture-discovery.md`.
- A public, reliable domain on Railway for `web`, reachable outside
  Railway's private network. `api` does not need one — see Milestone 7/9.
- A security baseline appropriate for the product (request validation,
  rate limiting, security headers, a real session policy) — not a
  temporary or shortcut implementation. Because the frontend is a BFF, a
  public CORS policy is not required by default (see Milestone 7).
- A minimal persistence layer (Prisma + PostgreSQL) backing all of the
  above.

### Post-MVP

- Surgery/Control modification beyond the basic correction case, and
  delete operations generally.
- Platform Admin.
- Observability, CI/CD hardening, file storage, notifications, payments.
- Any Research Study capability beyond what `research-study.ts` already
  implements (locking, versioning, publishing, audit).
- Any Resident capability beyond assignment/removal/registration already
  defined in Domain.

### Unknown / blocked by discovery

- **CustomField / structured clinical measurements** — blocked by product/
  clinical discovery (ADR 0005 explicitly defers the value model pending
  a physician consultation). Unaffected by the Resident/Research scope
  change — neither capability's MVP-required subset touches CustomField.
- **Exact pterygium clinical measurements and interpretation rules** —
  same block; not to be guessed.
- **Frontend framework** — narrowed (Next.js under consideration) but not
  yet locked; see "Unknown / open" above.
- **Frontend/API hosting topology** (same-origin BFF vs. cross-origin with
  CORS) — affects Milestone 7's and Milestone 9's design; see "Unknown /
  open" above.

---

## Capability Map

> Columns extended after the MVP replanning pass: `API` is split into
> write/read because those are genuinely different completion states
> today; `UI` and `Human E2E` added because "reachable via HTTP" and
> "usable by a physician through the product" are no longer treated as
> equivalent — see Progress Measurement below.

| Capability                                                                | Domain | Application | Persistence | API write | API read | UI  | Human E2E | Overall status                                                                                 |
| ------------------------------------------------------------------------- | ------ | ----------- | ----------- | --------- | -------- | --- | --------- | ---------------------------------------------------------------------------------------------- |
| Physician registration + authentication                                   | N/A    | ✅          | ✅          | ✅        | N/A      | ❌  | ❌        | Technically complete; no UI — Milestone 8                                                      |
| Patient (register + retrieve)                                             | ✅     | ✅          | ✅          | ✅        | ✅       | ✅  | ❌        | UI built (Milestone 8, in progress) — no public deployment/human walkthrough yet (Milestone 9) |
| Procedure Type (register + retrieve)                                      | ✅     | ✅          | ✅          | ✅        | ✅       | ❌  | ❌        | Technically complete; no UI — Milestone 8                                                      |
| Surgery + Control history (register/record/modify + retrieve)             | ✅     | ✅          | ✅          | ✅        | ✅       | ❌  | ❌        | Technically complete; no UI — Milestone 8                                                      |
| Resident (register, assign/remove on Surgery, retrieve)                   | ✅     | ✅          | ✅          | ✅        | ✅       | ❌  | ❌        | Technically complete; no UI — Milestone 8                                                      |
| Research Study (create, edit, manage universe, full lifecycle, retrieve)  | ✅     | ✅          | ✅          | ✅        | ✅       | ❌  | ❌        | Technically complete; no UI — Milestone 8                                                      |
| `api` security baseline (validation, forwarded-IP rate limiting, headers) | N/A    | N/A         | N/A         | ✅        | N/A      | N/A | N/A       | Complete — Milestone 7                                                                         |
| `web` security baseline (headers/CSP, client-IP forwarding)               | N/A    | N/A         | N/A         | N/A       | N/A      | ❌  | N/A       | Not started — Milestone 8 (`web` doesn't exist yet)                                            |
| Public reachability                                                       | N/A    | N/A         | N/A         | N/A       | N/A      | N/A | ❌        | No public domain attached — Milestone 9                                                        |
| Platform Admin visibility                                                 | ❌     | ❌          | ❌          | ❌        | ❌       | ❌  | ❌        | Post-MVP, not started at any layer                                                             |

**Nothing is Human-E2E complete yet.** Every MVP-required backend
capability (Milestones 1–7) is now `TECHNICALLY_COMPLETE` — proven
end-to-end at the HTTP/Postgres level — but "proven by an automated HTTP
test" and "usable by a physician through the product" are different
claims; that gap closes with Milestone 8 (frontend) and Milestone 9
(public domain + human walkthrough) — see Progress Measurement below.

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

### Milestone 4 — Read/Query for the core loop

**Objective**: a physician can retrieve their own Patients, Procedure
Types, and Surgeries (with full Control history) through authenticated
HTTP.

**Why it exists**: closes the gap the MVP gap analysis identified — the
product's own stated purpose ("seguir" — follow up) is impossible
without reading data back. Also the smallest, lowest-risk remaining
item: no new schema, no new architectural pattern, extends ports already
proven three times (Patient/ProcedureType/Surgery repositories already
follow the same shape).

**Prerequisites**: Milestones 1–3 (satisfied). No product decision
required.

**Scope**: add `findByPhysicianId(physicianId): Promise<T[]>` to
`PatientRepository`, `ProcedureTypeRepository`, `SurgeryRepository`
(Application ports) plus their Prisma implementations; `GET /patients`,
`GET /procedure-types`, `GET /surgeries` (list, scoped to the
authenticated physician); `GET /patients/:id`, `GET /procedure-types/:id`,
`GET /surgeries/:id` — the last three need only new routes, since
`findById` already exists on every repository and `Surgery.reconstitute`
already loads the full Control history; each must verify
`resource.physicianId === request.physicianId` before returning (404,
not 403, for a foreign resource — no existence leakage across tenants).

**Explicitly out of scope**: Resident/Research read (their own
milestones); pagination/filtering/sorting beyond "all of mine"; any new
Domain method (none needed — this is pure query).

**Deliverables**: 3 new repository methods × 3 repositories; 6 new HTTP
routes.

**Definition of Done**: a physician can register a Patient/ProcedureType/
Surgery/Control via the existing write routes, then retrieve every one
of them via the new read routes, and cannot retrieve another physician's
data.

**Measurable completion criteria**: a passing e2e test (real HTTP, real
Postgres) proving list + get for all three resources, plus a
cross-tenant 404 test for each.

**Dependencies**: none beyond Milestones 1–3.

**Testing strategy**: Application-level tests (fakes) for the new
list/get operations' orchestration only. Infrastructure-level tests
proving `findByPhysicianId` returns the right rows and no others. HTTP
e2e tests proving the full retrieve-after-write flow and cross-tenant
rejection. No Domain-level tests needed — nothing in Domain changes.

**Status**: `COMPLETED` — `findByPhysicianId` added to
`PatientRepository`, `ProcedureTypeRepository`, and `SurgeryRepository`
(Application ports) with matching Prisma implementations; `GET
/patients`, `GET /procedure-types`, `GET /surgeries` (list) and `GET
/patients/:id`, `GET /procedure-types/:id`, `GET /surgeries/:id` (get)
added to `packages/http`, each verifying `resource.physicianId ===
request.physicianId` and returning 404 (not 403) for a foreign resource.
`get-surgery` returns the full Control history via the already-existing
`Surgery.reconstitute` load path — no new Domain code. HTTP e2e tests
prove list + get for all three resources plus cross-tenant 404 for each;
Infrastructure round-trip tests prove `findByPhysicianId` scoping. No
Domain changes.

---

### Milestone 5 — Resident capability (vertical slice)

**Objective**: a physician can register a Resident, assign/remove them
from a Surgery, and see their own Residents and each Surgery's
participant roster.

**Why it exists**: Resident is MVP-required by explicit product decision.
The Domain already fully defines every rule (assignment, removal,
participation-preservation) — this closes the Application/Infrastructure/
HTTP gap around an already-approved Domain, not new discovery.

**Prerequisites**: Milestones 1–3. Recommended after Milestone 4 (reuses
its list/get route pattern) but not hard-blocked by it — parallelizable.

**Scope**: `registerResident` Application operation (mirrors
`registerPatient` — `Resident.create` already exists);
`removeResidentFromSurgery` Application operation (mirrors
`assignResidentToSurgery`; `Surgery.removeResident` already exists in
Domain, untouched); add `save()` and `findByPhysicianId` to
`ResidentRepository`; a new `residents` Prisma model (mirrors
`patients`/`procedure_types` exactly) and migration; `PrismaResidentRepository`;
HTTP routes `POST /residents`, `GET /residents`, `GET /residents/:id`,
`POST /surgeries/:id/residents` (wraps the existing
`assignResidentToSurgery` unchanged), `DELETE /surgeries/:id/residents/:residentId`.

**Explicitly out of scope**: any Resident permission model beyond what's
already coded — DOMAIN.md §10 explicitly states no additional resident
permission rules are assumed. No change to `Surgery.assignResident` /
`removeResident` / `hasResidentParticipated`.

**Deliverables**: `residents` table + migration; two new Application
operations; `PrismaResidentRepository`; 5 new HTTP routes.

**Definition of Done**: a physician can register a Resident, assign them
to a Surgery, have that Resident record a Control (already works —
unchanged), attempt removal (rejected once they've recorded a Control —
existing invariant), and list their own Residents.

**Measurable completion criteria**: e2e test proving register → assign →
record-control-as-resident → removal-rejected-after-participation →
removal-allowed-before-participation, plus cross-tenant rejection on
assignment (already covered at Application level — confirm it still
passes, don't duplicate).

**Dependencies**: Milestones 1–3; benefits from (not blocked by)
Milestone 4's pattern.

**Testing strategy**: no new Domain tests (Domain unchanged). Application
tests for the two new operations (fakes), mirroring
`assignResidentToSurgery.test.ts`'s structure. Infrastructure round-trip
tests for `PrismaResidentRepository`, mirroring `PrismaPatientRepository`'s
tests. HTTP e2e covering the full vertical.

**Status**: `COMPLETED` — `registerResident` and
`removeResidentFromSurgery` added to `packages/application`, each a thin
wrapper mirroring the existing `registerPatient`/`assignResidentToSurgery`
pattern with no Domain changes; a `residents` Prisma model (mirrors
`patients` exactly) and migration added; `PrismaResidentRepository`
added, mirroring `PrismaPatientRepository`; HTTP routes `POST
/residents`, `GET /residents`, `GET /residents/:id`, `POST
/surgeries/:id/residents`, `DELETE
/surgeries/:id/residents/:residentId` added. An e2e test proves the full
vertical (register → assign → record-control-as-resident →
removal-rejected-after-participation → removal-allowed-before-
participation) and cross-tenant rejection.

---

### Milestone 6 — Research capability (vertical slice)

**Objective**: a physician can create a Research Study, edit its text
fields, manage its Surgery universe, move it through its lifecycle,
delete it while DRAFT, and read/list their own studies.

**Why it exists**: Research is MVP-required by explicit product decision.
Same situation as Milestone 5 — the Domain (`research-study.ts`) already
fully implements every rule. This is Application/Infrastructure/HTTP
wiring around an aggregate already reviewed and approved.

**Prerequisites**: Milestones 1–3. Recommended after Milestone 4 for the
same pattern-reuse reason; not hard-blocked — parallelizable.

**Scope**: Application operations `createResearchStudy`,
`updateHypothesis`, `updateResults`, `updateAnalysis`, `updateConclusion`,
`removeSurgeryFromResearchStudy` (mirrors the existing
`addSurgeryToResearchStudy`), `moveResearchStudyToInProgress`,
`completeResearchStudy`, `reopenResearchStudy`, `deleteResearchStudy` —
each a thin wrapper over the corresponding already-implemented Domain
method; new Prisma models `research_studies` (id, physicianId,
hypothesis/results/analysis/conclusion nullable text, status,
timestamps) and a `research_study_surgeries` join table (mirrors
`SurgeryParticipant`'s shape); `PrismaResearchStudyRepository`; HTTP
routes `POST /research-studies`, `GET /research-studies`,
`GET /research-studies/:id`, `PATCH /research-studies/:id` (text
fields), `POST /research-studies/:id/surgeries`,
`DELETE /research-studies/:id/surgeries/:surgeryId`,
`POST /research-studies/:id/status` (transitions),
`DELETE /research-studies/:id`.

**Explicitly out of scope**: any research capability not already in
`research-study.ts` — no versioning, no publishing, no audit trail
(DOMAIN.md and ADR 0006 already exclude these). CustomField-driven
structured measurements remain blocked on ADR 0005, unaffected by this
milestone.

**Deliverables**: 2 new Prisma models + migration; ~9 Application
operations; `PrismaResearchStudyRepository`; 8 new HTTP routes.

**Definition of Done**: a physician can create a study, add/remove
surgeries, edit all four text fields, move DRAFT → IN_PROGRESS →
COMPLETED, reopen it, and delete a DRAFT study — each transition's guard
enforced exactly as already coded in Domain, no new business logic
invented anywhere above Domain.

**Measurable completion criteria**: e2e test exercising the full
lifecycle including at least one rejected transition (e.g. editing a
COMPLETED study) and one cross-tenant rejection.

**Dependencies**: Milestones 1–3; benefits from Milestone 4's pattern.

**Testing strategy**: no new Domain tests. Application tests per
operation (fakes) — thin orchestration tests, most resembling
`addSurgeryToResearchStudy.test.ts`. Infrastructure round-trip tests for
the two new tables. HTTP e2e for the full lifecycle.

**Status**: `COMPLETED` — all ~11 Application operations
(`createResearchStudy`, `updateHypothesis`/`updateResults`/
`updateAnalysis`/`updateConclusion`, `removeSurgeryFromResearchStudy`,
`moveResearchStudyToInProgress`, `completeResearchStudy`,
`reopenResearchStudy`, `deleteResearchStudy`, `listResearchStudies`,
`getResearchStudy`) added, each a thin wrapper over the corresponding
Domain method; `research_studies` and `research_study_surgeries` Prisma
models added (the bridge table deliberately has no FK to `surgeries`,
mirroring the `SurgeryParticipant` precedent of not embedding
cross-aggregate references); `PrismaResearchStudyRepository` added. One
Domain addition was made during integration review, beyond what the
implementing agent was asked to touch: `ResearchStudy.reconstitute(...)`
was added to `packages/domain`, mirroring `Surgery.reconstitute`
exactly, so hydration no longer replays `addSurgery`/
`moveToInProgress`/`complete` against already-persisted rows — the same
anti-pattern Milestone 2 introduced `Surgery.reconstitute` specifically
to avoid. An e2e test exercises the full lifecycle (create, edit,
add/remove surgeries, DRAFT → IN_PROGRESS → COMPLETED → reopen →
IN_PROGRESS, rejecting edits while COMPLETED) plus cross-tenant
rejection.

---

### Milestone 7 — API security & operational hardening

**Objective**: `api` (`packages/http`) has a security baseline
appropriate for a clinical-data product as **defense-in-depth** — not
because `api` itself will be publicly exposed (it won't be — only `web`
gets a public domain, see Milestone 9) but because "private network
only" is a network-boundary control, not a substitute for the
application itself being robust. Not a temporary or shortcut baseline,
per explicit product decision.

**Why it exists**: verified gaps, confirmed by direct inspection of
`packages/http`: zero request-body validation on any route, no rate
limiting (login is brute-forceable today), no security headers, no
structured logging, no health check.

**Prerequisites**: none technical — orthogonal to Milestones 4–6 and can
proceed in parallel with all of them.

**Scope** (revised — two tension points resolved during the
post-decision documentation review, see Risks and Unknowns): request
validation (Fastify JSON-schema on every route body/params — this is
**structural/shape validation only**: "is this a well-formed request,"
not a re-implementation of Domain business rules like "Patient requires
a non-empty firstName," which stays exactly where it already is, in
Domain — schema validation duplicating a Domain invariant would be the
kind of duplication this milestone must avoid, not introduce); rate
limiting (`@fastify/rate-limit`) on `POST /sessions` and
`POST /physicians`, **keyed by the real client IP forwarded from `web`
in a trusted header** (e.g. `X-Forwarded-For`/`X-Real-IP`), not by raw
TCP source IP — see the rate-limiting tension note below for why this
distinction is load-bearing, not stylistic; security headers
(`@fastify/helmet` or equivalent) on `api`'s own responses; `GET /health`
route + `deploy.healthcheckPath` on the Railway service for `api`;
structured logging (enable Fastify's logger or wire Pino, currently
fully disabled). **CORS is not required**: `web`'s server calls `api`
server-to-server, the browser never talks to `api` directly (see
Planning Decision 1 for the one scenario that would reopen this).

**Explicitly out of scope**: authentication mechanism changes (email +
password + session is decided, not reopened); a WAF/DDoS-mitigation
service (no evidence of need at current scale); regulatory/compliance
certification work (a separate, still-open decision); **verifying that
`web` can actually reach `api` over the private network** — `web`
doesn't exist yet at this point in the plan, so that verification
correctly belongs in Milestone 8, not here (see that milestone's
Definition of Done). This milestone only needs to leave `api` in a state
where that connection is possible: no public domain required to
function, and its Railway private DNS name (`${{http.RAILWAY_PRIVATE_DOMAIN}}`
in Railway's variable-reference syntax) is exactly what Milestone 8 will
consume.

**Deliverables**: validation schemas on every route; rate-limit (keyed
by forwarded client IP) + helmet plugins configured; health check route;
structured logging enabled.

**Definition of Done**: a malformed request body returns a clean 400
(not a 500); repeated failed login attempts from the same real client IP
are throttled even though they all arrive at `api` from `web`'s single
Railway-internal address; response headers include the standard
security set; `/health` returns 200 and is wired as the Railway health
check; `api` has no public domain attached and does not need one to
pass its own tests.

**Measurable completion criteria**: an HTTP test suite proving each of
the above (malformed-body rejection, rate-limit triggering per forwarded
IP — not collectively for all callers, `/health` 200).

**Dependencies**: none.

**Testing strategy**: HTTP-level tests only — this is entirely an
HTTP-adapter concern; nothing in Domain/Application changes.

**Status**: `COMPLETED` — Fastify JSON-schema validation added on every
route's body/params (structural only, no Domain-rule duplication);
`@fastify/rate-limit` added on `POST /sessions` and `POST /physicians`,
keyed by `forwardedClientIp` (reads `X-Forwarded-For` then
`X-Real-IP`, falling back to a shared bucket if neither is present —
see `packages/http/src/shared/rate-limit-key.ts`); `@fastify/helmet`
added for security headers; `GET /health` route added
(unauthenticated); structured logging enabled via Fastify's built-in
Pino logger. One integration bug was found and fixed while merging this
milestone alongside Milestone 5: Fastify's AJV default
(`removeAdditional: true`) was stripping a valid property from
`recordControl`'s discriminated `author` oneOf union before evaluation
— fixed by setting `ajv: { customOptions: { removeAdditional: false } }`
in `build-app.ts`. `packages/http/src/e2e/security.test.ts` proves
malformed-body rejection, per-forwarded-IP rate-limit triggering, and
`/health` returning 200.

---

### Milestone 8 — Minimal physician-facing frontend (Next.js App Router, BFF)

**Objective**: a physician can complete the full MVP workflow (auth,
Patient/ProcedureType/Surgery/Control, Resident, Research) through a
real web interface, not raw HTTP.

**Why it exists**: explicit product decision — "a physician must be able
to use the system through a real accessible application." This is the
largest remaining piece of work.

**Technology decision (confirmed, see
`docs/architecture/frontend-architecture-discovery.md` for the full
reasoning)**: Next.js, App Router, new package `packages/web`. Runs as a
BFF — its own server calls `packages/http` server-to-server; the browser
never talks to `api` directly, so no `SameSite=None` cookie and no
public CORS policy are needed. Server Components are the default; Client
Components (`"use client"`) are the deliberate exception, reserved for
forms and genuinely interactive leaf components. Reads happen in Server
Components (SSR, no client-side fetch waterfall); writes happen through
Server Actions that call `api`. Directory structure is feature-based
with App Router route groups, one per vertical slice
(Patient/ProcedureType/Surgery/Resident/Research), mirroring the
backend's own package structure.

**Prerequisites**: Milestone 4 (needs read endpoints to show anything);
Milestones 5–6 needed for full MVP-workflow coverage (a frontend
omitting Resident/Research isn't covering the MVP).

**Scope**: login/logout; Patient list + create + detail; Procedure Type
list + create; Surgery list + create + detail (showing Control history);
Control record + modify (inline on the Surgery detail view); Resident
list + create + assign/remove on a surgery; Research Study list + create

- edit + lifecycle actions — each as a Server-Component read path plus a
  Server-Action write path, per the pattern in
  `frontend-architecture-discovery.md` §5. **Two items that belong here
  specifically because `web`, not `api`, is the actual public-facing
  surface** (moved from Milestone 7 during the post-decision documentation
  review — see Risks and Unknowns): (a) security headers/CSP for `web`
  itself (Next.js `headers()`/middleware — `api`'s Milestone-7 headers
  don't cover `web`'s own responses, they're a different HTTP surface);
  (b) Server Actions forward the real client IP to `api` in a trusted
  header (e.g. `X-Forwarded-For`), so Milestone 7's per-client rate
  limiting on `api` keys correctly instead of collapsing every physician
  into `web`'s single Railway-internal source address.

**Explicitly out of scope**: Platform Admin UI; any visual design system
beyond what's needed for usability; mobile-native apps; any client-side
state-management library (React Query, Redux, Zustand, etc.) for data a
Server Component can fetch directly.

**Deliverables**: a deployable frontend application (`packages/web`),
wired to `api` over the private network; `web`'s own security headers;
client-IP forwarding to `api`.

**Definition of Done**: every MVP-required backend capability from
Milestones 1–6 has a corresponding, reachable screen; a person
unfamiliar with the API can complete the full workflow using only the
UI; the "as little client-side React as possible" rule is actually
observed — no route's data-fetching path uses a client-side data library
where a Server Component would do; **`web` is verified able to reach
`api` over Railway's private network** (this is the first point in the
plan where that connection can actually be tested — `web` doesn't exist
before this milestone).

**Measurable completion criteria**: a scripted (e.g. Playwright)
browser-level walkthrough of the full workflow passes against a real
deployment.

**Dependencies**: Milestone 4 (hard); Milestones 5–6 (soft — needed for
full MVP coverage); Milestone 7 (`api` must be ready to accept
private-network traffic and forwarded-IP-keyed rate limiting).

**Testing strategy**: genuine browser-level E2E tests belong here for
the first time — not duplicating the HTTP e2e tests already proving
backend correctness, but proving the UI correctly drives that
already-proven backend.

**Status**: `IN_PROGRESS` — the first vertical slice (Authentication +
Patients) is built and verified, following exactly the design in
`docs/architecture/milestone-8-design.md` with no undocumented
architectural deviation. **Not yet done**: Procedure Type, Surgery +
Control, Resident, and Research Study are not built — this milestone's
DoD ("every MVP-required backend capability... has a corresponding,
reachable screen") is not met until they are. `web` has not been
deployed to Railway, so "verified able to reach `api` over Railway's
private network" is also not yet checked — only local `web` ↔ local
`api` has been proven.

Concretely, what exists in `packages/web` today:

- `lib/api-client.ts` (the sole `fetch` boundary to `api`), `lib/session.ts`
  (`web_session` cookie — see below), `lib/client-ip.ts`, and
  `lib/authed-api-request.ts` (the single point where an `ApiAuthError`
  becomes a redirect to `/login`, per §7 of the design document).
- `proxy.ts` (Next 16 renamed "middleware" to "proxy" — same cookie-
  _presence_-only check the design specifies, not a second auth
  authority).
- Login (`POST /sessions`) and logout (`DELETE /sessions`), with the
  four requirements `milestone-8-session-security-review.md` added
  before implementation: fail-closed login (no session cookie set if
  `api`'s response carries no extractable session id), unconditional
  cookie-clearing logout (even if invalidating on `api` fails).
- The Patients vertical slice: list, detail, and registration, each a
  Server Component read (`features/patients/queries.ts`) or a Server
  Action write (`features/patients/actions.ts`) — no client-side `fetch`
  anywhere.
- The typed error contract from the design (`ApiAuthError`/
  `ApiNotFoundError`/`ApiDomainError`/`ApiUnexpectedError`), wired
  end-to-end: a missing patient renders via `not-found.tsx`
  (`notFound()`), an unexpected failure would hit `error.tsx`, and a
  `DomainError` from `api` is shown inline on the registration form
  exactly as `api` phrased it.
- `components/ui/*` — a small shadcn/ui-style primitive set (Button,
  Input, Label, Card, Table, Alert) built on plain semantic HTML with
  `class-variance-authority`, not Base UI — see "Deviations and
  decisions made during implementation" below for why.
- 48 tests (`lib/`, `features/auth/`, `features/patients/`, `proxy.ts`)
  plus a real, manual browser walkthrough against a locally-running
  `api` and a real (test-data, since cleaned up) Postgres row — login,
  register a patient, view it in the list and its own detail page, a
  nonexistent patient id correctly rendering `not-found.tsx`, logout,
  and confirming an unauthenticated request to `/patients` redirects to
  `/login`. Not a substitute for Milestone 8's own eventual scripted
  Playwright walkthrough (still `NOT_STARTED`, tracked in this
  milestone's Measurable completion criteria) — this was a manual
  verification during implementation, not the deliverable itself.

**Deviations and decisions made during implementation** (none reopen an
existing architectural decision — see Roadmap Maintenance Rule 8):

- **Next.js 16 renamed the "middleware" file convention to "proxy"**
  (`packages/web/src/proxy.ts`, exporting `proxy` instead of
  `middleware`) — a framework naming change between when
  `milestone-8-design.md` was written and when Next 16 was actually
  installed, not a design change; the file's one responsibility
  (cookie-presence check only) is unchanged.
- **`components/ui/*` uses plain semantic HTML + `class-variance-authority`
  for Button/Input/Label/Card/Table/Alert, not Base UI primitives.**
  `@base-ui/react` (the current package name — `@base-ui-components/react`
  is deprecated/renamed) is installed and is the project's intended
  primitive layer, but none of these six components have ARIA/behavioral
  complexity Base UI would add value to (no popover, no listbox, no
  focus-trap) — using it for a plain `<button>` would be exactly the
  "unnecessary abstraction" Roadmap/Milestone 8 rules warn against. Base
  UI is expected to earn its place the first time a genuinely complex
  interactive primitive is needed (e.g. a Select for assigning a Resident
  in a future slice).
- **`lib/authed-api-request.ts`** is a small addition not itemized by
  name in `milestone-8-design.md`'s file list, but implements exactly
  what that document's §7 already specified ("every route/component...
  catch by type... trigger the redirect for 401") — centralized into one
  function instead of repeated per feature, which
  `milestone-8-design.md` itself calls the correct pattern (§2's "single
  chokepoint" reasoning, applied one layer up so `api-client.ts` itself
  stays free of `next/navigation` knowledge).

**No other deviation was found or required** — `web_session`'s mechanics,
the Server/Client Component split, the error-status mapping, and the
feature-folder structure all match the design document as written.

---

### Milestone 9 — Public domain + human E2E validation

**Objective**: a real physician (starting with the product owner)
completes the entire MVP workflow through a browser, against the
publicly deployed product.

**Why it exists**: the accessibility priority behind this replanning
pass — human E2E testing against the deployed product. Deliberately
last: exposing the product publicly before Milestone 7 (security) or
Milestone 8 (frontend) exist would mean exposing an unvalidated,
unrestricted-login, headerless API with no UI.

**Prerequisites**: Milestones 4–8 all complete.

**Scope**: attach a Railway public domain to `packages/web` only — `api`
stays on the private network per Milestone 7/8's BFF pattern and does
not need a public domain at all; verify HTTPS on `web`'s domain; verify
session cookies behave correctly in a real browser (same-origin, so this
should be the simple case the BFF pattern was chosen to guarantee); a
real, unscripted human walkthrough.

**Explicitly out of scope**: load testing, multi-region deployment, a
CDN, any public domain for `api` — no evidence any of this is needed at
current scale.

**Deliverables**: a public URL for `web`; a completed human walkthrough
with findings recorded.

**Definition of Done**: a designated tester can, unaided, register, log
in, and complete the full core-loop + Resident + Research workflow
through the deployed frontend, with no manual API calls.

**Measurable completion criteria**: a signed-off human walkthrough, plus
zero P0 issues found during it.

**Dependencies**: everything above.

**Testing strategy**: human-driven, not automated — the one stage in the
whole plan that is deliberately not a test suite.

**Status**: `NOT_STARTED`

---

## Dependency Graph

```
Milestones 1–7 (DONE, deployed)
                                    │
                                    ▼
     Milestones 4 + 5 + 6 ──▶ Milestone 8 (Frontend: Next.js App Router, BFF)
                                    │
        Milestone 7 (private network to api) ───┤
                                    ▼
                          Milestone 9 (Public domain for web + human E2E)
```

**Sequential (hard)**: Milestones 1–3 → {4, 5, 6, 7} → 8 → 9.

**Completed in parallel**: Milestones 4, 5, 6, and 7 had no dependency
on each other and were implemented simultaneously (separate git
worktrees, merged into `main` in sequence) — different code paths,
different Prisma models, with schema-touching milestones (5, then 6)
sequenced against each other while the schema-free milestones (4, 7)
ran fully in parallel. All four are now `COMPLETED` and merged.

**Blocked**: nothing remains blocked on a framework decision — Next.js
App Router + BFF is confirmed. Milestone 9 remains blocked on Milestone
8 completing (Milestones 4–7 are done).

**Deferred, not scheduled**: CustomField/clinical measurements (blocked
on physician consultation), notifications, payments, Platform Admin,
CI/CD hardening, file storage, backup/recovery strategy,
security/regulatory certification work beyond Milestone 7's baseline.

---

## Progress Measurement

> **Extended** during the MVP replanning pass to distinguish "reachable
> via an automated test" from "usable by a physician through the
> product" — the two were being conflated.

Progress is measured by capability state, not by files, lines of code,
commits, or token usage. For a given capability:

- **NOT_STARTED** — no Application-layer operation exists for it, even if
  the underlying Domain behavior does.
- **IN_PROGRESS** — an Application-layer operation exists and is tested
  against fakes, but no real persistence or reachable surface exists yet.
- **TECHNICALLY_COMPLETE** — a real (non-fake) persistence implementation
  exists, is reachable through a real, authenticated HTTP call, and is
  proven by a passing e2e test — but there is still no UI path to it and
  no human has used it through the actual product.
- **END_TO_END_COMPLETE** — reachable and provable through the deployed
  frontend by a human, not only by an automated HTTP client.

A capability is never considered MVP-complete merely because its Domain
or Application implementation exists, and — as of this replanning pass —
**not merely because it is reachable via HTTP either.** Every
MVP-required backend capability — Physician auth, Patient/Procedure
Type/Surgery/Control (Milestones 1–4), Resident (Milestone 5), Research
Study (Milestone 6), and the `api` security baseline (Milestone 7) — is
now `TECHNICALLY_COMPLETE`: real HTTP, real auth, real persistence,
proven by e2e tests in `packages/http` against a real Railway Postgres
instance. Nothing in the project is `END_TO_END_COMPLETE` yet — that
only becomes possible once Milestone 8 (frontend) and Milestone 9
(public domain + human walkthrough) exist.

---

## Current Milestone

> **CURRENT MILESTONE: 8 — Minimal physician-facing frontend (Next.js App Router, BFF). `IN_PROGRESS`: the Authentication + Patients vertical slice is built and verified; Procedure Type, Surgery + Control, Resident, and Research Study are not.**

Milestones 1 through 7 are complete (see their entries above and
Historical Progress below): the full core loop plus read/query,
Resident, Research, and the `api` security baseline are all
`TECHNICALLY_COMPLETE` — real HTTP, real auth, real persistence, proven
against a real Railway Postgres instance, with the full workspace
quality gate (lint, format-check, typecheck, test — 81 Domain + 102
Application + 45 Infrastructure + 31 HTTP tests) green, including the
M4–M7 conformance-review fixes (see the Risks and Unknowns entry above
and `docs/architecture/m4-m7-conformance-review.md`).

Milestone 8 is now `IN_PROGRESS` — see its full entry above for exactly
what exists in `packages/web` today (48 passing tests; lint,
format-check, and typecheck all green workspace-wide) and what does not
yet. It is **not** complete: only one of five vertical slices
(Authentication + Patients) is built, `web` has not been deployed to
Railway, and Milestone 8's own Definition of Done requires every
MVP-required backend capability to have a reachable screen. What
remains is the other four vertical slices (Procedure Type, Surgery +
Control, Resident, Research Study), then public reachability and human
validation (Milestone 9).

---

## Next Milestone

**Still Milestone 8** — continue building the remaining vertical slices
(Procedure Type, Surgery + Control, Resident, Research Study), each
following the same pattern the Authentication + Patients slice already
proved out (`features/<slice>/{queries,actions,dtos,mappers,schemas,components}`,
Server Components for reads, Server Actions for writes, the same typed
error contract). No open decision blocks any of them — the pattern is
proven, not merely designed. Once all five slices exist and `web` is
deployed to Railway with its private-network path to `api` verified,
Milestone 8's Definition of Done is met and Milestone 9 (public domain +
human validation) becomes the next milestone.

---

## Risks and Unknowns

- **Two tension points found and resolved during the post-decision
  documentation review that followed confirming Next.js/BFF** (not
  Milestone defects — the plan was updated before either was
  implemented): (1) Milestone 7 originally claimed it would "confirm a
  private-network path between `web` and `api` works" as part of its own
  Definition of Done, despite `packages/web` not existing until Milestone
  8 — a real sequencing contradiction, now fixed by moving that specific
  verification into Milestone 8 and leaving Milestone 7 responsible only
  for what's verifiable with `api` alone. (2) Naive IP-based rate
  limiting on `api`'s `/sessions`/`/physicians` routes would be
  ineffective once the BFF pattern is live: every request reaches `api`
  from `web`'s single Railway-internal address, so rate-limiting by raw
  source IP would throttle all physicians collectively instead of
  individual attackers — now fixed by keying rate limiting on a real
  client IP that `web` forwards in a trusted header (Milestone 8) and
  `api` trusts and rate-limits on (Milestone 7).
- Milestone 1 closed the gap where Application operations did not cover
  the Domain's own stated core purpose (postoperative follow-up /
  `recordControl`) — a real, evidence-based gap, not a stylistic
  observation.
- Infrastructure (Milestone 2) and HTTP + auth (Milestone 3) both exist
  and are now deployed and running on Railway — but read/query,
  Resident, Research, frontend, security hardening, and public
  reachability still do not exist at all; any planning that assumes
  those are "mostly done" would be incorrect.
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
  future milestones, not as an open risk. This pattern was re-verified
  during Milestones 5 and 6: `removeResidentFromSurgery` and every
  Research Study operation each check the relevant tenant explicitly
  wherever the underlying Domain method has no parameter to do so
  itself — no unaddressed gap of this class was found.
- **`PrismaSurgeryRepository.save()` participant-persistence lost-update
  risk (deferred, not a Milestone 2 defect).** `save()` replaces the
  persisted `SurgeryParticipant` rows with `deleteMany` + `createMany`
  based on the in-memory `participatingResidentIds` set at save time,
  rather than an incremental diff. Two concurrent `save()` calls against
  the same Surgery, each working from its own stale snapshot, could have
  the second save's full replace silently drop a participant the first
  save added. **Explicitly deferred**: no optimistic locking, version
  column, or participant-diffing logic should be introduced until the
  project has a concrete multi-writer/concurrent-editing requirement —
  there is no such requirement today, though Milestone 5 (Resident) is
  the first point where real physicians might actually trigger this
  pattern, so it is worth re-checking after Milestone 9's human
  walkthrough, not before.
- CustomField's value model remains blocked on a physician consultation
  (ADR 0005) and cannot be scheduled into any milestone until that input
  exists — unaffected by Resident/Research becoming MVP-required, since
  neither touches CustomField.
- HTTP framework and authentication mechanism were resolved (Fastify;
  email + password with PostgreSQL-backed server-side sessions) and
  implemented in Milestone 3 — no longer an open risk.
- Resident and Research each needed new Prisma tables/migrations, not
  purely Application-layer wiring — both are now implemented (Milestones
  5–6) with `residents`/`research_studies`/`research_study_surgeries`
  tables in place.
- CORS/cookie strategy is resolved by the confirmed BFF hosting topology
  (Next.js `web` calls `api` server-to-server; the browser never talks
  to `api` directly) — no longer open.
- **Milestone 8 architectural design is complete** —
  `docs/architecture/milestone-8-design.md` turns
  `frontend-architecture-discovery.md`'s decisions into a concrete
  design (BFF↔`api` boundary, session propagation via a `web`-owned
  cookie relaying `api`'s session id, Server/Client Component rules,
  error handling for 401/404/domain-400 — `api` never returns 403 — DTOs/
  mappers, testing strategy), validated against the real M1–M7 routes
  rather than assumed.
- **The M4–M7 conformance review's two actionable findings are fixed.**
  `docs/architecture/m4-m7-conformance-review.md` checked M4–M7's actual
  implementation against their own documented Scope/DoD and found two
  gaps, both now corrected in a dedicated fix pass before Milestone 8's
  implementation began: (1) `resident.ts`/`research-study.ts` now
  declare request-body/params JSON schemas (mirroring `core-loop.ts`),
  closing the case where a malformed `POST /research-studies` body
  returned `500` instead of the clean `400` Milestone 7's DoD requires —
  covered by 8 new tests in `security.test.ts`; (2) `listResidents`/
  `getResident` were added to `packages/application` and `resident.ts`
  now calls them instead of `ResidentRepository` directly, matching
  every other resource's read pattern — covered by 5 new Application
  tests. A third finding (two different Domain→wire-shape conventions
  across resources) was resolved as a deliberate, documented decision
  rather than a refactor — see `application-layer-discovery.md` §8: both
  conventions stay (neither is a duplication risk, and
  `milestone-8-design.md` already absorbs the variation), with the
  DTO-returning convention recorded as the default for new Application
  read operations going forward. Full workspace quality gate green after
  the fixes: 81 Domain + 102 Application + 45 Infrastructure + 31 HTTP
  tests (259 total).
- **Milestone 8's design has been re-verified against the stabilized
  backend, and its session mechanism has passed a dedicated security
  review — implementation is not yet authorized.** After the M4–M7 fix
  pass above, `milestone-8-design.md` was re-checked against the actual
  API (not the documented gaps that existed before the fix pass); two
  small staleness notes in its §8 navigable-flow section were corrected
  (cosmetic — the endpoints didn't change). Separately,
  `milestone-8-session-security-review.md` gives a dedicated review of
  §3's `web_session` design (relaying `api`'s own session id in a
  `web`-owned cookie), requested explicitly given this product handles
  clinical data. **Verdict: architecturally approved** — the mechanism
  introduces no new exposure beyond what `api`'s own session cookie
  already carries, and the plausible alternative (`web` minting its own
  indirection token instead of relaying `api`'s) was evaluated and
  correctly rejected as adding complexity without a security benefit in
  this architecture. Four small, concrete requirements from that review
  are now folded into `milestone-8-design.md` §3/§11 (fail-closed
  login/logout handling; confirming the `secure` cookie flag's
  correctness is a deployment-configuration checklist item, not an
  assumed fact) — none of them change the mechanism itself. **This does
  not authorize Milestone 8 implementation** — that remains a separate,
  explicit go-ahead from the product owner, still pending as of this
  entry.

---

## Planning Decisions Requiring Approval

_(Decisions already made explicitly by the product owner — Read/Query,
Resident, and Research are MVP-required; a real frontend is required,
confirmed as Next.js App Router run as a BFF (`packages/web` calling
`packages/http` server-to-server, not a CORS-facing client — see
`docs/architecture/frontend-architecture-discovery.md`); a non-shortcut
security baseline is required; Railway remains the fixed host with
separate `api`/`web` services — are not re-listed here.)_

1. **Whether `api` should ever be reachable by anything other than
   `web`'s server** (e.g. a future mobile client) — decides whether
   `api` stays Railway-private-only indefinitely or eventually needs a
   public CORS policy in addition to the BFF path. Leans toward
   private-only given no such client exists today, but not yet formally
   closed.
2. **Whether CI/CD, security/audit, and regulatory-compliance work
   beyond Milestone 7's baseline must land before any real (non-test)
   physician or patient data is stored.** A risk-tolerance decision, not
   inferable from the repository alone.
3. **Backup/recovery policy for the Postgres instance** — plan-tier and
   risk-tolerance decision on Railway, not inferable from the repository.

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

| Milestone                                                                                                                                                                   | Status    | Completion evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Milestone 1 — Complete the core clinical Application capability set                                                                                                         | COMPLETED | `registerPatient`, `registerProcedureType`, `registerSurgery`, `recordControl`, `modifyControl` implemented in `packages/application/src`; 79 Domain + 30 Application tests passing; full workspace quality gate (lint, format-check, typecheck, test) green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Milestone 2 — Real persistence for the core loop                                                                                                                            | COMPLETED | `packages/infrastructure` added with a Prisma schema for Physician/Patient/ProcedureType/Surgery/Control (+ `SurgeryParticipant`, no Resident table); `PrismaPatientRepository`/`PrismaProcedureTypeRepository`/`PrismaSurgeryRepository` implement the existing Application ports unchanged; `Surgery.reconstitute(...)` added to Domain as the sole hydration mechanism; all five Milestone 1 operations run against real repositories (no fakes) and pass against a real Postgres instance on Railway; 80 Domain + 30 Application + 17 Infrastructure tests passing; full workspace quality gate green                                                                                                                                                                                                                                                                                                                                                                                                 |
| Milestone 3 — Minimal reachable surface (HTTP + auth)                                                                                                                       | COMPLETED | `packages/http` (Fastify) added with `POST /physicians`, `POST /sessions`, `DELETE /sessions`, and the five Milestone 1 operations behind a `requireAuth` preHandler resolving physicianId only from the session cookie; `registerPhysician`/`login`/`logout` added to `packages/application` with `PhysicianRepository`/`PhysicianCredentialRepository`/`PasswordHasher`/`SessionRepository` ports; `PrismaPhysicianRepository`/`PrismaPhysicianCredentialRepository`/`PrismaSessionRepository`/`BcryptPasswordHasher` added to `packages/infrastructure`; `PhysicianCredential`/`Session` Prisma models added (case-insensitive email uniqueness via a normalized unique index, no `citext`); e2e tests (real HTTP, real bcrypt, real session cookie, real Postgres) cover registration, login success/failure, session expiry, logout, unauthenticated rejection, and cross-tenant rejection; 80 Domain + 40 Application + 31 Infrastructure + 8 HTTP tests passing; full workspace quality gate green |
| Milestone 4 — Read/Query for the core loop                                                                                                                                  | COMPLETED | `findByPhysicianId` added to `PatientRepository`/`ProcedureTypeRepository`/`SurgeryRepository` with Prisma implementations; `GET /patients`, `GET /procedure-types`, `GET /surgeries` (list) and `GET /patients/:id`, `GET /procedure-types/:id`, `GET /surgeries/:id` (get, including full Control history) added to `packages/http`, each enforcing tenant scoping with 404 (not 403) on a foreign resource; e2e tests prove list + get for all three resources plus cross-tenant 404 for each; no Domain changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Milestone 5 — Resident capability (vertical slice)                                                                                                                          | COMPLETED | `registerResident` and `removeResidentFromSurgery` added to `packages/application`; `residents` Prisma model + migration and `PrismaResidentRepository` added; HTTP routes `POST /residents`, `GET /residents`, `GET /residents/:id`, `POST /surgeries/:id/residents`, `DELETE /surgeries/:id/residents/:residentId` added; e2e test proves register → assign → record-control-as-resident → removal-rejected-after-participation → removal-allowed-before-participation, plus cross-tenant rejection; no Domain changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Milestone 6 — Research capability (vertical slice)                                                                                                                          | COMPLETED | ~11 Application operations added, each a thin wrapper over the existing `research-study.ts` Domain methods; `research_studies` and `research_study_surgeries` Prisma models added (bridge table has no FK to `surgeries`, mirroring `SurgeryParticipant`); `PrismaResearchStudyRepository` added; 8 HTTP routes added for the full lifecycle; `ResearchStudy.reconstitute(...)` added to `packages/domain` during integration review, mirroring `Surgery.reconstitute`, so hydration no longer replays transition-guard methods against persisted rows; e2e test exercises the full lifecycle (create, edit, add/remove surgeries, DRAFT → IN_PROGRESS → COMPLETED → reopen → IN_PROGRESS, rejecting edits while COMPLETED) plus cross-tenant rejection                                                                                                                                                                                                                                                   |
| Milestone 7 — API security & operational hardening                                                                                                                          | COMPLETED | Fastify JSON-schema validation added on every route; `@fastify/rate-limit` added on `POST /sessions`/`POST /physicians`, keyed by forwarded client IP (`X-Forwarded-For`/`X-Real-IP`, not raw TCP source IP); `@fastify/helmet` added for security headers; `GET /health` route added; structured logging enabled via Fastify's built-in Pino logger; a Fastify AJV `removeAdditional` bug affecting `recordControl`'s discriminated `author` union was found and fixed (`removeAdditional: false`) during integration; e2e tests prove malformed-body rejection, per-forwarded-IP rate-limit triggering, and `/health` 200                                                                                                                                                                                                                                                                                                                                                                               |
| **Milestones 4–7 integration** — merged in sequence into `main` from four parallel git worktrees                                                                            | COMPLETED | Full workspace quality gate (lint, format-check, typecheck, test) green with all four milestones combined: 81 Domain + 97 Application + 45 Infrastructure + 23 HTTP tests passing against a real Railway Postgres instance; `prisma migrate status` confirms no drift across all migrations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **M4–M7 conformance-review fix pass** — corrected the two actionable findings from `docs/architecture/m4-m7-conformance-review.md`, before Milestone 8 implementation began | COMPLETED | `resident.ts`/`research-study.ts` now declare request-body/params JSON schemas (previously zero — a malformed `POST /research-studies` body returned 500, not the clean 400 Milestone 7's DoD requires); `listResidents`/`getResident` added to `packages/application`, `resident.ts` now calls them instead of `ResidentRepository` directly, matching every other resource's read pattern; the Domain→wire-shape convention question was resolved as a documented decision (`application-layer-discovery.md` §8), not a refactor — both existing conventions kept, one recorded as the default for new work. `ResearchStudy.reconstitute` re-verified against the same criteria as `Surgery.reconstitute` (§7.1) — no persistence logic hidden in Domain. 5 new Application tests + 8 new HTTP tests; full workspace quality gate green: 81 Domain + 102 Application + 45 Infrastructure + 31 HTTP tests (259 total)                                                                                    |

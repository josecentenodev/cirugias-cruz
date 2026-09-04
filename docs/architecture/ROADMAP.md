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
- **Physician self-registration + Resident authentication (Milestone
  8.5, ADR 0015/0016/0017)** — done after Milestone 8's original
  closure, ahead of Milestone 9: a physician can create their own
  account through `web` (no manual provisioning), and a Resident now
  has their own login — issued a temporary password by the Physician,
  scoped read/write access to only the Surgeries they participate in.
  See Milestone 8.5's entry below for full detail.

### Partially completed

- Nothing — every Application-layer capability the MVP Definition below
  requires (Milestones 1–7) is now implemented, tested, and reachable
  through authenticated HTTP against real Postgres. What remains is
  CustomField's `packages/web` UI, the rest of the frontend, and public
  reachability (Milestones 8–9), not partially-built backend capability.

### Not started

- **CustomField's `packages/web` UI** (Milestone 8.6) — backend (Domain/
  Application/Infrastructure/HTTP) is complete and tested; only the UI
  for defining and filling CustomFields remains, deliberately deferred to
  a follow-up pass.
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
Both services build and deploy successfully from `main`: `api`
(Railway service name `cirugias-cruz`) and, since Milestone 8's closure,
`web` too (`https://web-production-c686b1.up.railway.app`).

### Explicitly deferred

- Pterygium-specific clinical measurements and interpretation rules — this
  is still not to be guessed or hard-coded. It stays deferred **as
  content**, but no longer blocks CustomField's own implementation (see
  "Resolved by explicit product decision" below): the whole point of the
  now-decided CustomField mechanism is that the platform never needs to
  know pterygium-specific fields in code — the physician defines their own
  schema, for pterygium or any other specialty.
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
reasoning and Milestone 8 for its scope. **CustomField's value model is
now also MVP-required and unblocked** (product owner decision, made
while reviewing Milestone 9's own scripted re-verification pass — see
Milestone 8.6 below): [ADR 0018](../decisions/0018-customfield-value-representation.md)
defines `valueType`/constraint/`scope` and its placement inside the
`ProcedureType`/`Surgery` aggregates; [ADR 0019](../decisions/0019-customfield-persistence-schema.md)
defines its normalized-SQL persistence. This was informed by reviewing a
working prototype independently built by the physician who is this
project's source of clinical requirements — see
[`physician-prototype-analysis.md`](../domain/physician-prototype-analysis.md).
That review supplied the structural evidence ADR 0005 was waiting on (two
concrete cases: a once-per-Surgery enumerated value, and a
once-per-Control numeric measurement at fixed timepoints) — it did **not**
supply, and this decision does **not** assume, any pterygium-specific
field content, which remains deferred exactly as before.

---

## MVP Definition

> **Revised** during the post-Milestone-3 MVP replanning pass. Read/Query,
> Resident, and Research moved from "Post-MVP" to "MVP-required" by
> explicit product decision — this is a deliberate, approved scope change,
> not scope creep; see Roadmap Maintenance Rule 8.
>
> **Revised again**, ahead of Milestone 9's human walkthrough: CustomField
> moved from "Unknown / blocked by discovery" to "MVP-required" by
> explicit product owner decision, on the grounds that a physician cannot
> meaningfully complete the MVP's core workflow (register a Surgery,
> record Controls) for their own real practice without being able to
> define the structured fields specific to it — the generic
> extensibility mechanism itself, not any specific clinical content, is
> what became required. See Milestone 8.6.

### MVP-required

- Physician registration + authentication (Application/HTTP done —
  Milestone 3; self-registration through `web`, with the email-
  confirmation step paused for MVP — done, Milestone 8.5, ADR
  0015/0016).
- Register **and retrieve** a Patient, within the acting physician's
  tenant (read was missing; see Milestone 4).
- Register **and retrieve** a Procedure Type.
- Register **and retrieve** a completed Surgery for a Patient + Procedure
  Type, including its full Control history.
- Record and modify a Control against a Surgery — the capability
  DOMAIN.md itself names as the product's core purpose — and be able to
  **read it back** (implicit in retrieving the owning Surgery).
- **Resident**: register a Resident, assign/remove them on a Surgery,
  and retrieve a physician's own Residents (Milestone 5) — plus, since
  Milestone 8.5 (ADR 0017), the Resident's own authentication and
  scoped access: login with a Physician-issued temporary password,
  mandatory first-login change, a Surgery panel scoped to what they
  participate in, and record/edit-own-Control rights. This is a real,
  confirmed permission model now — see `DOMAIN.md` §10a (the earlier
  "no additional resident permission rules are assumed" no longer
  holds).
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
- **CustomField**: a physician can define `CustomField`s (name,
  description, unit, magnitude, `valueType`, constraint, `scope`) on
  their own Procedure Types, and record/retrieve values against a Surgery
  (`SURGERY` scope) or each of its Controls (`CONTROL` scope) — exactly
  the mechanism `ADR 0018`/`ADR 0019` define, no more. No specific
  clinical field content is assumed or hard-coded by the platform.

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

- **Exact pterygium (or any other specialty's) clinical measurements and
  interpretation rules** — still not to be guessed or hard-coded. This no
  longer blocks any platform capability, though: CustomField's mechanism
  (now MVP-required, see above) is generic by design, so the platform
  needs no further clinical discovery to build it — only the physician,
  using it, needs to know their own field content.
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

| Capability                                                                                     | Domain | Application | Persistence | API write | API read | UI  | Human E2E | Overall status                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------ | ----------- | ----------- | --------- | -------- | --- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Physician authentication (login/logout)                                                        | N/A    | ✅          | ✅          | ✅        | N/A      | ✅  | ❌        | UI built (Milestone 8, COMPLETED); publicly deployed on Railway — no human walkthrough yet (Milestone 9)                    |
| Physician self-registration                                                                    | N/A    | ✅          | ✅          | ✅        | N/A      | ✅  | ❌        | UI built (Milestone 8.5, COMPLETED — `/signup`); email confirmation dormant, not enforced (ADR 0016)                        |
| Resident authentication (login, forced password change, temp-password issue/reset, deactivate) | N/A    | ✅          | ✅          | ✅        | N/A      | ✅  | ❌        | Milestone 8.5, COMPLETED; no human walkthrough yet                                                                          |
| Resident's own Surgery panel (read own Surgeries, record/edit-own Control)                     | N/A    | ✅          | N/A         | ✅        | ✅       | ✅  | ❌        | Milestone 8.5, COMPLETED; shows Patient/ProcedureType by id, not name — known gap, see Risks                                |
| Patient (register + retrieve)                                                                  | ✅     | ✅          | ✅          | ✅        | ✅       | ✅  | ❌        | UI built (Milestone 8, COMPLETED); publicly deployed on Railway — no human walkthrough yet (Milestone 9)                    |
| Procedure Type (register + retrieve)                                                           | ✅     | ✅          | ✅          | ✅        | ✅       | ✅  | ❌        | UI built (Milestone 8, COMPLETED); publicly deployed on Railway — no human walkthrough yet (Milestone 9)                    |
| Surgery + Control history (register/record/modify + retrieve)                                  | ✅     | ✅          | ✅          | ✅        | ✅       | ✅  | ❌        | UI built (Milestone 8, COMPLETED); publicly deployed on Railway — no human walkthrough yet (Milestone 9)                    |
| Resident (register, assign/remove on Surgery, retrieve, credential mgmt)                       | ✅     | ✅          | ✅          | ✅        | ✅       | ✅  | ❌        | UI built (Milestone 8, credential actions added Milestone 8.5); no human walkthrough yet                                    |
| Research Study (create, edit, manage universe, full lifecycle, retrieve)                       | ✅     | ✅          | ✅          | ✅        | ✅       | ✅  | ❌        | UI built (Milestone 8, COMPLETED); publicly deployed on Railway — no human walkthrough yet (Milestone 9)                    |
| CustomField (define on Procedure Type; record/retrieve values on Surgery/Control)              | ✅     | ✅          | ✅          | ✅        | ✅       | ❌  | ❌        | Backend complete (Milestone 8.6, ADR 0018/0019); `packages/web` UI not yet built |
| `api` security baseline (validation, forwarded-IP rate limiting, headers)                      | N/A    | N/A         | N/A         | ✅        | N/A      | N/A | N/A       | Complete — Milestone 7                                                                                                      |
| `web` security baseline (headers/CSP, client-IP forwarding)                                    | N/A    | N/A         | N/A         | N/A       | N/A      | ✅  | N/A       | Complete — Milestone 8 (strict nonce-based CSP, `X-Frame-Options`, HSTS, etc.; see closure entry)                           |
| Public reachability                                                                            | N/A    | N/A         | N/A         | N/A       | N/A      | N/A | ❌        | Railway-provided domain live (Milestone 8); custom domain + human walkthrough — Milestone 9                                 |
| Physician-facing IA/navigation reorganized by clinical workflow                                | N/A    | N/A         | N/A         | N/A       | N/A      | ❌  | ❌        | Proposed, not started — see Milestone 10 (proposed)                                                                         |
| Design system / visual redesign                                                                | N/A    | N/A         | N/A         | N/A       | N/A      | ❌  | ❌        | Proposed, not started — see Milestone 10 (proposed)                                                                         |
| Platform Admin visibility                                                                      | ❌     | ❌          | ❌          | ❌        | ❌       | ❌  | ❌        | Post-MVP, not started at any layer                                                                                          |

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

**Status**: `COMPLETED`. All five vertical slices (Authentication +
Patients, Procedure Type, Surgery + Control, Resident, Research Study)
are built and verified, following exactly the design in
`docs/architecture/milestone-8-design.md` with no undocumented
architectural deviation. Every MVP-required backend capability from
Milestones 1–6 has a corresponding, reachable screen. The three items
this entry previously listed as outstanding are now done — see the
"Milestone 8 closure" subsection below for the audit and evidence:
`web`'s own security headers/CSP, `web`'s deployment to Railway with
its private-network path to `api` verified, and the scripted Playwright
walkthrough (this milestone's Measurable completion criteria).

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
- The Procedure Type vertical slice: list and registration only, per
  this milestone's own documented Scope (no detail page — a Procedure
  Type's list row already shows everything it has: name, description,
  technique). `getProcedureType` was deliberately not added to
  `features/procedure-types/queries.ts` since nothing calls it, matching
  Roadmap Maintenance Rule 8 (no unnecessary abstraction).
- The Surgery + Control vertical slice: list, detail (full Control
  history), registration, recording a Control, and modifying one inline
  — the aggregate's internal state (`controls`, `participatingResidentIds`)
  arrives nested in one `GET /surgeries/:id` response and is rendered
  as one unit, never as independent CRUD resources, matching
  `packages/domain`'s own rule that Control has no existence outside its
  owning Surgery. `features/surgeries/queries.ts` has no `getControl` —
  there is no such endpoint, by design (see
  `application-layer-discovery.md` §1.3). Recording/modifying a Control
  uses Server Actions bound with `.bind(null, surgeryId[, controlId])` —
  the standard Next.js pattern for passing context a submitted form
  itself never carries. `ControlRow.tsx`'s inline edit toggle
  (`useState`) is the one place in this slice with meaningfully local
  UI state, justifying its Client Component boundary; the surrounding
  list, and the surgery's own fields, stay a Server Component. The "New
  Surgery" form's Patient/Procedure Type dropdowns, and the detail
  page's patient/procedure-type name resolution, reuse
  `features/patients/queries.ts`/`features/procedure-types/queries.ts`
  unchanged — no new `api` call was introduced for either. Recording a
  Control as a resident is scoped to `Surgery.participatingResidentIds`
  only (never a free-text id) and is disabled with an explanatory note
  when that list is empty.
- The Resident vertical slice: list and registration
  (`features/residents/`), per this milestone's own documented Scope (no
  detail page, same reasoning as Procedure Type — `listResidents` is the
  only query; no `getResident`, since nothing calls it). Assigning/
  removing a Resident **on a Surgery** lives on the Surgery detail page,
  not a Resident-owned one — `assignResidentAction`/`removeResidentAction`
  are defined in `features/surgeries/actions.ts`, mirroring `api` itself
  (`assignResidentToSurgery`/`removeResidentFromSurgery` are both
  `packages/application/src/surgery/` operations, not `resident/` ones).
  Landing this slice also resolved the placeholder left by the Surgery
  slice: `toControlView`/`toSurgeryDetailView` now take a `residentNames`
  lookup (built from `listResidents()`, the same reuse pattern as
  Patient/ProcedureType name resolution) so a Control's author and a
  Surgery's participant roster show real names instead of raw ids;
  `RecordControlForm`'s resident picker does the same. Removing a
  resident who has already recorded a Control is rejected by `api`
  (ADR 0010's participation-preservation rule) and shown inline next to
  that resident's row — verified directly in the browser walkthrough
  below, not assumed from the backend's own passing tests alone.
- The Research Study vertical slice: list, detail, registration, an
  inline-editable set of the four text fields (hypothesis/results/
  analysis/conclusion — `ResearchStudyFieldsForm.tsx`, same toggle
  pattern as `ControlRow.tsx`), lifecycle transitions
  (`StatusActions.tsx` renders exactly one button for the study's
  _current_ status — `api`'s own `POST /research-studies/:id/status`
  route remains the sole authority on which `{ current, to }`
  combination is legal, this button never picks a Domain method by
  name), and managing the study's surgery universe (add/remove — both
  Server Actions live in `features/research-studies/actions.ts`, not
  `features/surgeries/actions.ts`, mirroring `api` itself:
  `addSurgeryToResearchStudy`/`removeSurgeryFromResearchStudy` are
  `packages/application/src/research-study/` operations, on
  ResearchStudy's own aggregate). `ResearchStudy` deliberately
  references Surgeries only by id (`packages/domain/src/research/
research-study.ts`), so resolving a `surgeryId` to a display label
  reuses `features/surgeries/mappers.ts`'s `toSurgeryListView` plus
  `listPatients()`/`listProcedureTypes()` — the same presentation-layer
  join `app/(dashboard)/surgeries/page.tsx` already performs, no new
  `api` call introduced. The "Edit" button, the surgery-removal button,
  and the add-surgery form are all hidden once a study is `COMPLETED`
  (a presentation convenience only — `api`'s own
  `ResearchStudy.assertModifiable` remains the actual enforcement,
  confirmed in the browser walkthrough below by driving a study through
  its full lifecycle: DRAFT → edit → add a surgery → IN_PROGRESS →
  COMPLETED (edit/remove controls disappear) → reopen → IN_PROGRESS
  (they reappear) → remove the surgery → delete the study). The delete
  button is likewise only rendered while `status === "DRAFT"`, per
  `ResearchStudy.assertCanBeDeletedBy`.
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
- 131 tests (`lib/`, `features/auth/`, `features/patients/`,
  `features/procedure-types/`, `features/surgeries/`,
  `features/residents/`, `features/research-studies/`, `proxy.ts`) plus
  real, manual browser
  walkthroughs against a locally-running `api` and real (test-data,
  since cleaned up) Postgres rows — for Patients: login, register a
  patient, view it in the list and its own detail page, a nonexistent
  patient id correctly rendering `not-found.tsx`, logout, and confirming
  an unauthenticated request to `/patients` redirects to `/login`; for
  Procedure Type: empty-state, registering one with all fields and one
  with only the required `name`, confirming the list shows both
  correctly (including the "—" placeholder for the two omitted optional
  fields); for Surgery + Control: registering a surgery against real
  Patient/ProcedureType dropdowns, viewing its detail page with
  correctly-resolved names, recording a Control as the physician,
  editing that Control inline, confirming the list's control count, and
  a nonexistent surgery id correctly rendering `not-found.tsx` (this
  walkthrough caught and led to fixing a real timezone bug, below, that
  no unit test alone would have surfaced); for Resident: registering two
  residents, assigning one to a surgery (dropdown correctly excludes
  already-participating residents and shows real names), removing that
  resident **before** they'd recorded a control (allowed), re-assigning
  and recording a control as that resident (author name resolved
  correctly in the Control history), then confirming removal is
  correctly **rejected inline** once they've participated — `api`'s own
  ADR-0010 invariant, shown verbatim in the UI, not a client-side
  pre-check; for Research Study: registering a blank study (every field
  is genuinely optional at the Domain level), editing its fields inline,
  adding a real surgery (label correctly resolved through Surgery's own
  Patient/ProcedureType name resolution), driving it DRAFT → IN_PROGRESS
  → COMPLETED → reopen → IN_PROGRESS, confirming the Edit/Remove/Delete
  affordances correctly appear and disappear at each status, removing
  the surgery, and deleting a separate DRAFT study end-to-end. Not a
  substitute for Milestone 8's own eventual scripted Playwright
  walkthrough (still `NOT_STARTED`, tracked in this milestone's
  Measurable completion criteria) — this was manual verification during
  implementation, not the deliverable itself.
- **Bug found and fixed during this slice's manual verification**:
  `toControlView`'s `recordedAtInputValue` (the value pre-filling a
  Control's inline edit `datetime-local` input) was originally built
  from `date.toISOString()` — UTC. A `datetime-local` input carries no
  timezone at all: the browser displays and resubmits its value as
  literal wall-clock digits, so pre-filling it from a UTC-formatted
  string caused a no-op edit (open, change nothing, save) to silently
  shift the Control's recorded time by the viewer's UTC offset — caught
  by testing the edit flow in the browser, not by any unit test, since
  the original unit test asserted the same (wrong) UTC-based value the
  mapper produced rather than the round-trip property that actually
  matters. Fixed by building the value from the `Date` object's own
  local getters instead, and a new test now asserts the round-trip
  property directly (unchanged edit ⇒ unchanged `recordedAtInputValue`)
  rather than a hardcoded, timezone-dependent string.
- **Bug found and fixed during the Research Study slice's manual
  verification**: `features/research-studies/queries.ts`'s
  `listResearchStudies` originally assumed `GET /research-studies`
  returns a bare array, like every other `list*` query in this
  codebase. It doesn't — `packages/http/src/routes/research-study.ts`
  sends its `ListResearchStudiesOutput` object as-is
  (`{ researchStudies: [...] }`), unlike `/patients`/`/surgeries`/etc.,
  which explicitly serialize to a bare array
  (`patients.map(serializePatient)` in `core-loop.ts`). This surfaced
  immediately as a rendering crash (`studies.map is not a function`) the
  first time the Research Studies list page was opened in the browser —
  no unit test caught it beforehand, since the test itself mocked the
  same (wrong) bare-array assumption the code made. Fixed by unwrapping
  the envelope inside `listResearchStudies` itself, so every other
  caller keeps the same `Promise<ResearchStudyDto[]>` shape every other
  feature's `list*` query already returns; the mismatched wire shape is
  now documented on `ListResearchStudiesResponse` in `dtos.ts`. This is
  the second slice in a row where the mandatory browser walkthrough
  caught a real defect no unit test alone would have (see the timezone
  bug above) — reinforcing why it stays a required step, not an optional
  one, before any slice is considered done.

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
  "unnecessary abstraction" Roadmap/Milestone 8 rules warn against. This
  held through the Resident slice too: the resident-assignment dropdown
  (`AssignResidentForm.tsx`) and the Control-authorship picker
  (`RecordControlForm.tsx`) both turned out to be a plain `<select>`
  filtered/populated server-side — no client-side search, multi-select,
  or async loading that would justify a richer primitive. Base UI is
  still expected to earn its place the first time a genuinely complex
  interactive primitive is actually needed, not assumed necessary in
  advance.
- **`lib/authed-api-request.ts`** is a small addition not itemized by
  name in `milestone-8-design.md`'s file list, but implements exactly
  what that document's §7 already specified ("every route/component...
  catch by type... trigger the redirect for 401") — centralized into one
  function instead of repeated per feature, which
  `milestone-8-design.md` itself calls the correct pattern (§2's "single
  chokepoint" reasoning, applied one layer up so `api-client.ts` itself
  stays free of `next/navigation` knowledge).
- **`eslint.config.mjs` gained one rule setting**
  (`@typescript-eslint/no-unused-vars`'s `argsIgnorePattern: "^_"`) —
  not a new convention, just correctly enforcing/exempting one this
  codebase already used throughout (`_previousState` in every Server
  Action bound via `useActionState`). It had only gone unflagged by
  positional accident (unused args before a used one are never checked);
  `removeResidentAction`'s `_previousState` is its _last_ parameter (no
  `formData` follows it, since removal needs no form input), which
  surfaced the gap. Workspace-wide, not `packages/web`-scoped, since the
  convention isn't either.

**No other deviation was found or required** — `web_session`'s mechanics,
the Server/Client Component split, the error-status mapping, and the
feature-folder structure all match the design document as written.

#### Milestone 8 closure — security headers, Railway deployment, Playwright walkthrough

The three items the Status paragraph above previously listed as
outstanding are now done. Audit, evidence-first:

| Criterion                                                                                   | Status                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication / Patients / Procedure Type / Surgery+Control / Resident / Research Study UI | PASS                                | Unchanged from the five slices above, re-verified in this closure pass end to end (manual browser walkthrough, and now also the scripted Playwright suite below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `web`'s own security headers                                                                | PASS                                | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation denied), `Strict-Transport-Security` (production only), `poweredByHeader: false` — all set in `packages/web/src/proxy.ts` via `lib/security-headers.ts`, confirmed present on `https://web-production-c686b1.up.railway.app`'s real response headers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| CSP                                                                                         | PASS                                | Strict, nonce-based, no `unsafe-inline`/`unsafe-eval`/wildcard sources (`lib/security-headers.ts`). Verified with **zero CSP violations** across a full manual browser walkthrough of every route (login, Procedure Type, Patient, Surgery detail, Control record+edit, Resident register+assign, Research Study create/add-surgery/edit/full lifecycle, logout, protected-route redirect) run against a real production build (`next start`) — this was first verified **locally**, then re-run in full against the **live Railway deployment itself** (a follow-up closure pass, since the original closure had only checked login + `/patients` live — see the Milestone 9 entry below). Required making every route dynamically-rendered (`export const dynamic = "force-dynamic"` on the handful of pages that didn't already have it) — Next's own nonce mechanism only threads through per-request-rendered pages; documented in each page's own comment.                                                                                                                                                                                                                                                                                                                 |
| Railway deployment                                                                          | PASS                                | New `web` service created in the existing `cirugias-cruz` Railway project, deployed from `main`, status `Online`: `https://web-production-c686b1.up.railway.app`. `packages/web/package.json`'s `start` script fixed (`next start`, no hardcoded `-p 3001`) so it honors Railway's injected `PORT`, per the known issue `docs/architecture/deployment-railway.md` had already flagged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `web → api` private network                                                                 | PASS                                | Proven repeatedly, not just at login: the full route walkthrough above (every write — Procedure Type, Patient, Surgery, Control, Resident, assign, Research Study create/edit/add-surgery/status transitions×3) was driven entirely through `https://web-production-c686b1.up.railway.app` and succeeded end to end — every one of those requests is only possible if `web`'s server reached `api` at `http://cirugias-cruz.railway.internal:3000` (the private domain — note the real Railway service name is `cirugias-cruz`, not `api`; see `deployment-railway.md`) and got a real response back each time. `api` has no public domain — the browser cannot have reached it directly. `document.cookie` reads empty on the live site (confirms `web_session` is `HttpOnly`, sent correctly over real HTTPS).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Playwright walkthrough                                                                      | PASS (with a documented scope note) | `packages/web/e2e/full-workflow.spec.ts` — one continuous scripted session covering login → Procedure Type → Patient → Surgery → Control record/edit → Resident register/assign → Research Study create/add-surgery/edit → full lifecycle (`DRAFT → IN_PROGRESS → COMPLETED`, UI restrictions verified, `→ reopen`) → logout → protected-route redirect. Ran and **passed** (1 test, ~1 minute, real round-trips throughout) against a real, locally-running `web`(`next start`) + `api` + the same Railway Postgres instance — not mocked anywhere. **Scope note**: it targets a local `web`/`api` pair, not literally the public Railway URL, because seeding a fresh test physician requires `POST /physicians` directly against `api`, which has no public domain by design (ADR 0014) and `web` has no self-registration UI (out of this milestone's Scope) — an external test runner cannot reach `api` to seed a user when targeting the public URL. The suite is configurable (`PLAYWRIGHT_BASE_URL`/`PLAYWRIGHT_API_BASE_URL`) to run against any reachable pair, including a future CI environment with real network access to `api`. Per-run unique test physician (`global-setup.ts`), auto-cleaned via `global-teardown` (verified: 0 leftover rows after the run). |
| Full quality gate                                                                           | PASS                                | lint + format-check + typecheck + `next build` green workspace-wide; full test suite green: 81 Domain + 102 Application + 45 Infrastructure + 31 HTTP + 139 web (was 131 — 8 new: `lib/security-headers.test.ts`) = 398 tests, all passing, including the full backend e2e suite re-run against real Postgres (not just `packages/web`, to confirm nothing here touched the backend).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Self-audit correction — `packages/web` had picked up a workspace-package
dependency**: the Playwright teardown originally imported
`createPrismaClient` from `@cirugias-cruz/infrastructure` directly inside
`packages/web/e2e/`, which added `@cirugias-cruz/infrastructure` to
`packages/web/package.json`'s `devDependencies`. That directly
contradicts `deployment-railway.md`'s own documented invariant ("`web`
... imports no workspace package") and is a real regression this
project's own established pattern had avoided — every prior slice's
manual cleanup used a **temporary, never-committed** script in
`packages/infrastructure`, never a permanent dependency from `web`. Found
during a follow-up self-review, not caught before the original closure
commit. Fixed: the cleanup logic now lives in
`packages/infrastructure/e2e-cleanup.ts` (the same, permanent home this
project's own scripts convention already used, just no longer deleted
after each use), invoked by `packages/web/e2e/global-setup.ts` as a
**child process** (`pnpm --filter @cirugias-cruz/http exec tsx
../infrastructure/e2e-cleanup.ts <physicianId>` — through `@cirugias-cruz/http`
specifically, since `packages/infrastructure` has no `tsx` of its own;
see the `api` service's own gotcha #1 above). `packages/web/package.json`
now has zero workspace-package dependencies again — re-verified: full
quality gate green, and the Playwright suite re-run and re-passed with
the new teardown, confirmed leaving 0 leftover rows.

**Config-as-code discrepancy found while creating the `web` service**:
Railway's public API now rejects `railwayConfigFile` ("Config as Code
... is deprecated. Use Infrastructure as Code (.railway/railway.ts)
instead.") — `railway.api.json`/`railway.web.json` were never actually
wired up as Railway's config source, despite `api`'s deployment matching
`railway.api.json` field-for-field; both services are configured with
those same values set directly on the service instance instead. Full
writeup: `docs/architecture/deployment-railway.md`'s "Config-as-code is
deprecated on this project" section — this is a platform-behavior
finding, not an application architecture decision, so it doesn't touch
any ADR.

---

### Milestone 8.5 — Physician self-registration + Resident authentication (ADR 0015/0016/0017)

**Objective**: a physician can create their own account through `web`
(no manual provisioning), and a Resident becomes a real authenticated
principal in their own right — able to log in and record/edit their own
Controls as themselves, instead of every "resident-authored" Control
actually being typed by the Physician on their behalf.

**Why it exists**: not originally part of Milestone 8's Scope (which
explicitly left self-registration out — see the Capability Map's prior
"not part of Milestone 8's documented Scope" note). Requested directly
by the product owner once Milestone 8 was live: there was no way for a
second physician to obtain an account, and Residents had no way to act
as themselves. Landed between Milestone 8's closure and Milestone 9
(human walkthrough), by explicit instruction — not a reordering of the
plan.

**Scope**:

- **ADR 0015 (physician self-registration + email confirmation) and ADR
  0016 (that confirmation gate paused for MVP)**: `POST /physicians`
  self-registration; a confirmation-email/token mechanism was built in
  full (`EmailConfirmationTokenRepository`, `ResendEmailSender`, the
  `/confirm-email` page) but its enforcement in `login` was then paused
  per ADR 0016 — registering and logging in work immediately, with no
  confirmation step. The machinery stays in the codebase, dormant, for
  a small, reversible Post-MVP re-enable.
- **ADR 0017 (Resident authentication)**: a Resident gets credentials
  when the Physician creates them (system-generated temporary password,
  mandatory change on first login, viewable-until-changed by the
  Physician, resettable/"blanqueo", deactivatable — forcing immediate
  session closure). `Session` gained an explicit `userType`
  (`"physician" | "resident"`). A Resident's own session is scoped to
  exactly the Surgeries they participate in: full read (including every
  Control on it, not only their own), record a Control, and edit —
  never delete — only a Control they themselves authored. This amends
  ADR 0004's "only the Physician may modify a Control" rule (see
  `docs/domain/DOMAIN.md` §7/§10a).

**Explicitly out of scope**: re-enabling the email-confirmation gate
(Post-MVP, ADR 0016); resolving Patient/ProcedureType **names** (not
just ids) for a Resident's own Surgery panel (see Not yet done, below);
any UX for a Resident whose session was just force-closed by
deactivation beyond the already-enforced 401 (see Not yet done).

**Deliverables**: `/signup`, `/signup/check-email`, `/confirm-email`
pages; `registerAction` (`web`); `EmailConfirmationToken`/
`ResendEmailSender` (Application/Infrastructure, dormant); `Session`
schema change (`userType`/`residentId`); `ResidentCredentialRepository`/
`TemporaryPasswordGenerator` ports + Prisma/Infrastructure
implementations; `changeResidentPassword`/`resetResidentPassword`/
`setResidentActive`/`viewResidentTemporaryPassword`/
`listSurgeriesForResident`/`getSurgeryForResident` (Application);
`requirePhysicianAuth`/`requireResidentAuth`/
`requireResidentPasswordChanged` (HTTP); `GET/POST /residents/:id/...`
credential routes, `PATCH /me/password`, `GET /me/surgeries(/:id)`,
`GET /me` (HTTP); `packages/web/src/app/resident/*` (own layout, forced
change-password, Surgery panel, Surgery detail), `features/
resident-session/*`, and inline credential actions on the Physician's
Resident list (`ResidentCredentialActions.tsx`).

**Definition of Done**: a physician can self-register and log in
immediately (no confirmation required); a physician can create a
Resident, view/reset their temporary password, and deactivate/
reactivate them; a Resident can log in with the temporary password, is
forced to change it before reaching anything else, then sees only the
Surgeries they participate in, can record a Control, can edit only
their own.

**Measurable completion criteria**: e2e test covering the full Resident
lifecycle (issue → login → forced change → Surgery panel → edit-own
vs. edit-other rejected → blanqueo → deactivate/reactivate), plus
cross-tenant rejection for every new Physician-side credential route.

**Dependencies**: Milestone 8 (needs `web` to exist).

**Status**: `COMPLETED` — implemented across all five layers, with new
tests at every layer (Domain: `Surgery.modifyControl`'s amended
authorization; Application: new operations per the Deliverables list
above; Infrastructure: `PrismaResidentCredentialRepository`,
`PrismaSessionRepository`'s `userType`/`deleteByResidentId`,
`PrismaSurgeryRepository.findByResidentId`, all against real Postgres;
HTTP: `packages/http/src/e2e/resident-auth.test.ts`'s full lifecycle,
`auth.test.ts` updated for the paused confirmation gate; Web: `features/
resident-session/*` and the credential-action components). Full
workspace quality gate green: 84 Domain + 137 Application + 63
Infrastructure + 39 HTTP + 174 web = 497 tests. Manually verified live
in the browser (not just automated tests): physician self-registration
and login without confirming email, resident creation with visible
temp password, forced first-login password change, and the resulting
Surgery panel.

**Bug found via manual browser verification, not the test suite**:
every bodyless `authedApiRequest` (e.g. the "reset password" button)
sent `content-type: application/json` with no body, which Fastify's
default JSON parser rejects with 400
(`FST_ERR_CTP_EMPTY_JSON_BODY`) before the route handler ever runs.
Every prior bodyless call in this codebase happened to use `DELETE`,
which Fastify doesn't route through body parsing the same way, so no
existing test caught it. Fixed in `packages/web/src/lib/api-client.ts`:
the `content-type` header is now only sent when there is an actual
body. Confirmed against the real API with `curl` before/after the fix;
covered by two new tests. Recorded here as the same pattern Milestone
8's own closure already flagged twice (the timezone bug, the
bare-array-vs-envelope bug) — the mandatory manual browser walkthrough
keeps finding real defects no unit/e2e suite alone catches.

**Not yet done** (tracked, not blocking MVP):

- The Resident's Surgery panel and detail page show the Patient and
  ProcedureType by raw **id**, not by name —
  `packages/web/src/features/resident-session/mappers.ts` documents
  why: a Resident session has no route to resolve those names (the
  Physician-side pages resolve them via `listPatients()`/
  `listProcedureTypes()`, both Physician-only). Fixing this needs a
  small, deliberate `api` decision (embed the names in `serializeSurgery`
  for a Resident caller, or add a narrow `/me`-scoped lookup) — not
  decided yet.
- No dedicated `web` UX for a Resident whose session was just
  force-closed by deactivation — their next request simply gets a 401
  and `authedApiRequest` redirects to `/login`, with no explanation
  shown. The security behavior is correct and already enforced
  server-side; only the messaging is missing.

**Additional gaps found via the product owner's own manual walkthrough
(2026-09-04, tracked, not blocking MVP)**:

- **Forms reset on error across the app, not just on success.**
  `LoginForm`, `RegisterForm`, and `ResidentForm` all use `useActionState`
  with an uncontrolled `<form action={...}>` (React 19 / Next 16), and
  their Server Actions never throw for a domain-level failure (wrong
  credentials, duplicate email) — they catch it and `return { error }`.
  Since the action completes without throwing, React 19 resets the
  uncontrolled fields regardless of whether `state` carries an error,
  wiping what the user typed (including the email) right when they most
  need it preserved. This is one root-cause pattern, hand-copied into at
  least 3 confirmed components and potentially more of the ~20 components
  under `packages/web/src/features/**/components/*.tsx` that use
  `useActionState` — not three independent bugs. No component-level
  render tests exist for these forms (only `actions.test.ts`, which
  checks the action's return value, not DOM behavior), which is why this
  wasn't caught earlier.
- **Deactivating a Resident gives the physician no feedback.** The
  mutation works (`PATCH /residents/:id/active`), but the only signal is
  the button being briefly disabled during the `useTransition` — no
  toast, no success/error message, and `ResidentList` has no
  active/inactive status column at all (consistent with the
  already-documented gap above: `GET /residents` doesn't report the
  field). This is the Physician-side counterpart of the Resident-side gap
  already tracked above — related but distinct.
- **Contradictory empty-state messages on a Surgery's resident
  assignment panel.** `SurgeryDetail.tsx` renders "No residents assigned
  yet" when `participants.length === 0`, and `AssignResidentForm.tsx`
  independently renders "Every registered resident is already assigned"
  when `availableResidents.length === 0` — the two conditions aren't
  coordinated, so both can render together, and in a tenant with zero
  Residents registered at all, the second message is actively wrong (it
  implies Residents exist and are all assigned, when none exist). Needs a
  third explicit state distinguishing "no Residents exist" from "all
  existing Residents are already assigned."

Planning for these (whether to unify the duplicated form-reset pattern
into one small shared utility, add component-level tests, and how to
sequence the two Resident-management gaps together) is captured outside
this repo, in the product owner's own testing notes — not yet scoped
into a numbered milestone here.

---

### Milestone 8.6 — CustomField / structured clinical extensibility (ADR 0018/0019)

**Objective**: a physician can define `CustomField`s on their own
Procedure Types (name, description, unit, magnitude, `valueType`,
constraint, `scope`), and record/retrieve values against a Surgery
(`SURGERY`-scoped fields) or against each Control of a Surgery
(`CONTROL`-scoped fields) — end to end, through Domain, Application,
Infrastructure, HTTP, and `web`.

**Why it exists**: promoted to MVP-required by explicit product owner
decision (see MVP Definition above), on the grounds that a physician
cannot complete the product's actual core workflow for their own real
practice without structured fields specific to their specialty and
procedures. This was triggered by the product owner's own scripted
re-verification pass ahead of Milestone 9 and a review of a working
prototype independently built by the physician who is this project's
clinical source — see
[`physician-prototype-analysis.md`](../domain/physician-prototype-analysis.md).
That review supplied the structural evidence (an enumerated value fixed
once per Surgery; a numeric value recorded repeatedly across Controls at
fixed timepoints) that let [ADR 0018](../decisions/0018-customfield-value-representation.md)
resolve `CustomField`'s value model — something ADR 0005 had explicitly
left blocked pending exactly this kind of input. It does **not** supply
any pterygium-specific field content, and none is assumed: the mechanism
is specialty-agnostic by design.

**Prerequisites**: Milestones 1–8.5 (the Procedure Type/Surgery/Control
core loop, already `COMPLETED`). No dependency on Milestone 9 itself,
though see Sequencing below.

**Scope**:

- **Domain** (`packages/domain`): extend the existing `CustomField` value
  object (`packages/domain/src/shared/custom-field.ts`) with `valueType`
  (`NUMBER | ENUM | TEXT | DATE`), a type-coherent constraint, and
  `scope` (`SURGERY | CONTROL`); add a `CustomField` definition
  collection to the `ProcedureType` entity/aggregate (no new aggregate,
  no new repository — mirrors how `Control` lives inside `Surgery`, ADR
  0004); add recorded-value handling to `Surgery`/`Control` for the
  values themselves.
- **Application** (`packages/application`): add `modify-procedure-type`
  (does not exist yet, despite Domain's `modify()` already supporting
  it) so `CustomField` definitions can actually be added/edited; add
  operations to record/retrieve `CustomField` values on Surgery/Control.
- **Infrastructure** (`packages/infrastructure`): Prisma migration for
  `custom_field_definitions` and `custom_field_values` (normalized,
  typed columns per ADR 0019 — not a JSON column); repository changes
  scoped to `ProcedureTypeRepository`/`SurgeryRepository`, no new
  repository.
- **HTTP** (`packages/http`) and **`web`**: routes/UI to define
  `CustomField`s on a Procedure Type and to fill in values when
  registering a Surgery or recording a Control.

**Explicitly out of scope**: any specific clinical field content
(pterygium or otherwise) — the platform ships the generic mechanism
only, the physician defines their own fields; any `valueType` beyond the
four listed; making `CONTROL`-scoped fields mandatory; cross-field
validation. See ADR 0018/0019's own "Not decided here" sections.

**Deliverables**: the mechanism above, tested at every layer following
this project's existing per-layer testing conventions, plus a short UI
flow letting the product owner's own physician define a real
`CustomField` set for pterygium as the first real usage (data they
enter, not code this project writes).

**Definition of Done**: the CustomField row in the Capability Map above
reaches ✅ at Domain/Application/Persistence/API write/API read; UI and
Human E2E follow Milestone 9's own walkthrough.

**Sequencing**: this milestone's backend/UI work should land before
Milestone 9's human walkthrough is signed off, so that walkthrough
validates the MVP's actual final scope (including CustomField) rather
than needing to be repeated. It does not block Milestone 9's already-
completed scripted re-verification or domain-decision work.

**Status**: `IN_PROGRESS` — backend complete (Domain, Application,
Infrastructure, HTTP); `packages/web` UI not yet built (deliberately
deferred to a follow-up pass, per the chosen backend-first sequencing).

What's done: `CustomField` (`packages/domain/src/shared/custom-field.ts`)
now carries `valueType`/constraint/`scope`, validated for internal
coherence at construction; `ProcedureType` owns a `CustomField`
collection (`addCustomField`, uniqueness-by-name enforced,
`reconstitute()` added); `Surgery`/`Control` accept optional
`customFieldValues` at creation. `packages/application` gained
`modifyProcedureType` and `addCustomField`, and `registerSurgery`/
`recordControl` validate incoming CustomField values against the owning
ProcedureType's definitions (`validateCustomFieldValues`) before
delegating to Domain. `packages/infrastructure` has a migration adding
`custom_field_definitions`/`custom_field_values` (normalized, typed
columns per ADR 0019, applied to the real Railway Postgres instance),
with `PrismaProcedureTypeRepository`/`PrismaSurgeryRepository` extended
accordingly. `packages/http` exposes `PATCH /procedure-types/:id`,
`POST /procedure-types/:id/custom-fields`, and
`customFieldValues` on the surgery/control write routes. Full workspace
quality gate green: 94 Domain + 158 Application + 84 Infrastructure + 40
HTTP tests, including a dedicated e2e test exercising the whole
CustomField flow over real HTTP against real Postgres.

Two real bugs were found and fixed during implementation, worth
recording: (1) Fastify/AJV's `coerceTypes` silently turned a numeric
CustomField value into a string, because an `anyOf: [string, number]`
schema tries branches in order — fixed by ordering `number` first: see
the code comment on `customFieldValueSchema` in `core-loop.ts`; (2) the
`custom_field_definitions`/`custom_field_values` FK-to-`procedure_types`
had no cascade, so both `packages/infrastructure` and `packages/http`
test-cleanup helpers needed updating to delete CustomField rows before
their parent Surgery/ProcedureType, mirroring the existing
children-before-parents convention.

Not yet done: `packages/web` UI for defining/filling CustomFields.

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

**Domain decision (made)**: keep Railway's own generated domain
(`https://web-production-c686b1.up.railway.app`) rather than attach a
custom one for now — a product/ops call, not an architectural one; a
custom domain can be added later without losing anything already built.

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

**Status**: `NOT_STARTED` (de-risked, not started). What's genuinely
done: the domain decision above; and, following a Railway build failure
this milestone's own investigation surfaced (see below), a full
**scripted** re-verification of every route directly against the live
deployment — Login, Procedure Type, Patient, Surgery, Control
record+edit, Resident register+assign, Research Study's full lifecycle
(create → add-surgery → edit → `DRAFT → IN_PROGRESS → COMPLETED` →
reopen), logout, protected-route redirect — all driven through
`https://web-production-c686b1.up.railway.app` itself, zero console/CSP
errors, test data cleaned up after (see the Milestone 8 closure entry's
updated CSP/private-network rows above for the detail). **What this is
not**: this milestone's own Definition of Done explicitly calls for "a
designated tester" completing the workflow "unaided" and a "signed-off
human walkthrough" — a scripted/automated pass, however thorough, is not
that. The actual human step (starting with the product owner) has not
happened yet and isn't something this session can perform or certify on
anyone's behalf — doing so would repeat exactly the kind of overclaim a
recent self-audit of this milestone's own closure caught and corrected
(see the "Self-audit correction" note above). Milestone 9 stays
`NOT_STARTED` until that walkthrough actually happens and any findings
from it are triaged.

**Railway build failure found and fixed along the way (unrelated to
Milestone 9's own scope, surfaced by an unrelated GitHub-triggered
rebuild)**: `web`'s Railway build failed with TypeScript errors inside
`packages/infrastructure/src` (`Prisma.InputJsonValue`/`JsonValue`
missing) — the same root cause the Milestone 8 self-audit had already
found and fixed locally (commit `476dead`, the leftover
`@cirugias-cruz/infrastructure` import from `packages/web/e2e/`, which
made `next build`'s typecheck reach into `infrastructure`'s source
against an un-generated Prisma client, since only `api`'s build runs
`prisma generate`). That fix was already pushed; the failing build was
an intermediate one from before the fix landed. Confirmed: `web` is
`Online` on the fixed commit, verified via the full route walkthrough
above.

---

### Milestone 10 — Physician-facing IA & design system rework (proposed, not yet approved)

**Status**: `PROPOSED` — raised by the product owner, captured here as
planning context. **No scope, menu structure, or visual design is
decided by this entry** — it records the problem and the product
owner's stated intent, nothing more. Do not treat anything below as an
approved design.

**Problem, as stated by the product owner**: the product currently
organizes itself around loose backend-mirroring concepts — a navbar
listing Patients / Procedure Types / Surgeries / Residents / Research
Studies as flat, independent links (`(dashboard)/layout.tsx`) — which
reflects how the vertical slices are built (§5 of
`frontend-architecture-discovery.md`), not how a physician actually
works. "Tenemos todo conceptualmente distribuído pero no verdaderamente
por oficio" — the product owner's own framing: distributed by concept,
not yet organized by the physician's actual clinical workflow.

**Second, related problem, also as stated by the product owner**: the
current visual design (`components/ui/*` — plain semantic HTML +
`class-variance-authority`, chosen deliberately minimal for Milestone 8,
see that milestone's "Deviations and decisions" note) was never meant
as the product's final look. The product owner wants a deliberate
redesign pass, and is concerned that **continuing to build new
components against the current ad-hoc styling makes that redesign more
expensive the longer it's deferred** — every new component added under
today's styling is a component that redesign will later have to touch
again.

**Why this is its own milestone, not folded into Milestone 9**: Milestone
9 is human validation of what already exists; this is a deliberate
redesign of the physician-facing experience itself — a different kind of
work, with its own set of decisions to make first (information
architecture grouped by clinical workflow rather than by resource type;
a chosen design system/direction) before any component is touched.

**Explicitly not decided here**:

- What the reorganized navigation/IA should actually look like (which
  workflows, which groupings) — the product owner has ideas, not yet
  captured as a decision.
- Which design system, component library, or visual direction to adopt.
- Whether this happens before or interleaved with Milestone 9's human
  walkthrough — a sequencing call for the product owner, not inferred
  here.

**Dependencies**: none technical. Blocked only on the product owner's
own design direction — not a code or architecture blocker.

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
                          Milestone 8.5 (Self-registration + Resident auth)
                                    │
                                    ▼
                          Milestone 8.6 (CustomField extensibility, ADR 0018/0019)
                                    │
                                    ▼
                          Milestone 9 (Public domain for web + human E2E)

                          Milestone 10 (IA/design rework, PROPOSED —
                          not sequenced against 9; blocked only on the
                          product owner's own design direction)
```

**Sequential (hard)**: Milestones 1–3 → {4, 5, 6, 7} → 8 → 8.5 → 9.

**Completed in parallel**: Milestones 4, 5, 6, and 7 had no dependency
on each other and were implemented simultaneously (separate git
worktrees, merged into `main` in sequence) — different code paths,
different Prisma models, with schema-touching milestones (5, then 6)
sequenced against each other while the schema-free milestones (4, 7)
ran fully in parallel. All four are now `COMPLETED` and merged.

**Blocked**: nothing remains blocked on a framework decision — Next.js
App Router + BFF is confirmed. Milestone 8.6 (CustomField) is ready to
start — Milestones 1–8.5 it depends on are all done. Milestone 9's human
walkthrough should ideally wait for Milestone 8.6 to land first (see
Milestone 8.6's Sequencing note), though its already-completed scripted
re-verification and domain decision are unaffected. Milestone 10 is not
sequenced against 9 or 8.6 at all — it's blocked only on the product
owner supplying an actual design direction, not on any other milestone.

**Deferred, not scheduled**: pterygium-specific (or other specialty)
clinical field _content_ (still requires physician input, but no longer
blocks any platform capability — see Milestone 8.6), notifications,
payments, Platform Admin, CI/CD hardening, file storage, backup/recovery
strategy, security/regulatory certification work beyond Milestone 7's
baseline.

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
instance. Every MVP-required capability is now reachable and provable
through the deployed frontend by a **scripted** client (Playwright,
against a real stack) — Milestone 8 is `COMPLETED`. Nothing is
`END_TO_END_COMPLETE` yet in the sense that matters most: no **human**
has walked through the deployed product yet — that remains Milestone 9's
own job (public custom domain + human validation).

---

## Current Milestone

> **CURRENT MILESTONE: 9 — Public domain + human E2E validation. `NOT_STARTED`. Milestones 8 (frontend) and 8.5 (self-registration + Resident authentication) are both `COMPLETED`. The product owner has also asked for Milestone 10 (physician-facing IA + design system rework) to be planned before the MVP is considered closed — `PROPOSED`, not yet approved or scoped; see that milestone's entry for what's actually decided (nothing beyond the problem statement).**

Milestones 1 through 8.5 are complete (see their entries above and
Historical Progress below): the full core loop plus read/query,
Resident, Research, the `api` security baseline, the frontend, physician
self-registration, and Resident authentication are all done, with the
full workspace quality gate (lint, format-check, typecheck, test — 84
Domain + 137 Application + 63 Infrastructure + 39 HTTP + 174 web = 497
tests) green, including the M4–M7 conformance-review fixes (see the
Risks and Unknowns entry above and
`docs/architecture/m4-m7-conformance-review.md`), Milestone 8's own
closure audit, and Milestone 8.5's own evidence (see each milestone's
entry above).

Milestone 8's Definition of Done was met when every MVP-required
backend capability got a reachable screen, `web` was verified able to
reach `api` over Railway's private network, and a scripted browser-level
walkthrough passed against that real stack. Milestone 8.5 then closed a
real gap Milestone 8 had explicitly left out of scope (no way for a
second physician to get an account; Residents with no login of their
own). What remains before the product is genuinely usable by a
physician is still Milestone 9 — a real custom domain (the current one
is Railway's own generated `*.up.railway.app` address) and, more
importantly, an actual human walking through the deployed product for
the first time; nothing about that milestone has started. **Separately**,
the product owner has raised Milestone 10 (IA reorganization +
design-system rework) as something to plan — not yet scoped, not
blocking Milestone 9's own readiness, but explicitly not something the
product owner wants left implicit while more UI keeps getting built
against today's ad-hoc styling (see Milestone 10's own entry for the
stated reasoning).

---

## Next Milestone

**Milestone 9 — Public domain + human E2E validation.** Concretely:

1. A custom domain for `web` (or a deliberate decision to keep the
   Railway-provided one, if that's judged sufficient for now) — this is
   a product/ops decision, not an open architectural question.
2. A real physician (starting with the product owner) walks through the
   full workflow using only the deployed UI, with no assistance from
   raw HTTP calls or prior knowledge of the API — the actual
   `END_TO_END_COMPLETE` bar Progress Measurement has been tracking
   toward since the MVP replanning pass.
3. Anything that walkthrough surfaces gets triaged and, if it blocks the
   MVP, fixed before Milestone 9 is considered done — this milestone's
   own point is to find what a scripted walkthrough can't.

No open architectural decision blocks starting this milestone.

**Also pending, raised by the product owner, not yet scoped**: Milestone
10 — a physician-facing IA/navigation reorganization and a visual
design-system rework. See that milestone's entry for the stated problem
and for what remains genuinely undecided (the actual menu structure, the
design direction, and whether it happens before or interleaved with
Milestone 9).

---

## Risks and Unknowns

- **Gaps left open by Milestone 8.5, tracked here, not blocking MVP**:
  (1) a Resident's own Surgery panel/detail page shows the Patient and
  ProcedureType by raw id, not by name — fixing it needs a small `api`
  decision; (2) no dedicated `web` UX for a Resident whose session was
  just force-closed by deactivation (their next request 401s and
  redirects to `/login` with no explanation) — the security behavior is
  correct and already enforced, only the messaging is missing; (3) a
  form-reset-on-error bug found via the product owner's manual
  walkthrough, confirmed as one root-cause pattern copied across at
  least 3 forms (Login, Registration, Resident creation) and potentially
  more; (4) deactivating a Resident gives the physician no visual
  feedback and no active/inactive status indicator; (5) a Surgery's
  resident-assignment panel can show two contradictory empty-state
  messages at once when a tenant has zero Residents registered. See
  Milestone 8.5's "Not yet done" for full detail on all five.
- **Componentizing cost risk, raised by the product owner ahead of
  Milestone 10**: every screen built against the current minimal
  `components/ui/*` primitives (chosen deliberately for Milestone 8,
  not as a final design — see that milestone's "Deviations and
  decisions") is a screen a future redesign pass will have to revisit.
  The product owner has flagged this explicitly and wants Milestone 10
  planned before much more UI is added on top of the current styling —
  see that milestone's entry. Not yet a decision to pause other UI
  work, just a named risk to weigh when deciding what to build next.
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
- **CustomField's value model is resolved and scheduled.** What ADR 0005
  left blocked on a physician consultation is now closed by ADR 0018
  (value model: `valueType`/constraint/`scope`, placement inside the
  `ProcedureType`/`Surgery` aggregates) and ADR 0019 (normalized-SQL
  persistence, not a JSON column), informed by reviewing a working
  prototype independently built by the project's physician — see
  `physician-prototype-analysis.md`. CustomField moved from "blocked by
  discovery" to MVP-required and is scheduled as Milestone 8.6. Note what
  did _not_ change: pterygium-specific (or other specialty) field
  _content_ is still not to be guessed or hard-coded — only the generic
  mechanism was unblocked.
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
4. **Milestone 10's actual scope** — the product owner has stated the
   problem (navbar/IA organized by backend resource, not clinical
   workflow; a visual redesign is wanted before more UI accumulates
   against today's minimal styling) but not yet the resolution: what the
   reorganized navigation should look like, and which design system/
   direction to adopt. See Milestone 10's own entry — this is captured
   as planning context, not a decision.

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

| Milestone                                                                                                                                                                   | Status    | Completion evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Milestone 1 — Complete the core clinical Application capability set                                                                                                         | COMPLETED | `registerPatient`, `registerProcedureType`, `registerSurgery`, `recordControl`, `modifyControl` implemented in `packages/application/src`; 79 Domain + 30 Application tests passing; full workspace quality gate (lint, format-check, typecheck, test) green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Milestone 2 — Real persistence for the core loop                                                                                                                            | COMPLETED | `packages/infrastructure` added with a Prisma schema for Physician/Patient/ProcedureType/Surgery/Control (+ `SurgeryParticipant`, no Resident table); `PrismaPatientRepository`/`PrismaProcedureTypeRepository`/`PrismaSurgeryRepository` implement the existing Application ports unchanged; `Surgery.reconstitute(...)` added to Domain as the sole hydration mechanism; all five Milestone 1 operations run against real repositories (no fakes) and pass against a real Postgres instance on Railway; 80 Domain + 30 Application + 17 Infrastructure tests passing; full workspace quality gate green                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Milestone 3 — Minimal reachable surface (HTTP + auth)                                                                                                                       | COMPLETED | `packages/http` (Fastify) added with `POST /physicians`, `POST /sessions`, `DELETE /sessions`, and the five Milestone 1 operations behind a `requireAuth` preHandler resolving physicianId only from the session cookie; `registerPhysician`/`login`/`logout` added to `packages/application` with `PhysicianRepository`/`PhysicianCredentialRepository`/`PasswordHasher`/`SessionRepository` ports; `PrismaPhysicianRepository`/`PrismaPhysicianCredentialRepository`/`PrismaSessionRepository`/`BcryptPasswordHasher` added to `packages/infrastructure`; `PhysicianCredential`/`Session` Prisma models added (case-insensitive email uniqueness via a normalized unique index, no `citext`); e2e tests (real HTTP, real bcrypt, real session cookie, real Postgres) cover registration, login success/failure, session expiry, logout, unauthenticated rejection, and cross-tenant rejection; 80 Domain + 40 Application + 31 Infrastructure + 8 HTTP tests passing; full workspace quality gate green                                                                                                                                              |
| Milestone 4 — Read/Query for the core loop                                                                                                                                  | COMPLETED | `findByPhysicianId` added to `PatientRepository`/`ProcedureTypeRepository`/`SurgeryRepository` with Prisma implementations; `GET /patients`, `GET /procedure-types`, `GET /surgeries` (list) and `GET /patients/:id`, `GET /procedure-types/:id`, `GET /surgeries/:id` (get, including full Control history) added to `packages/http`, each enforcing tenant scoping with 404 (not 403) on a foreign resource; e2e tests prove list + get for all three resources plus cross-tenant 404 for each; no Domain changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Milestone 5 — Resident capability (vertical slice)                                                                                                                          | COMPLETED | `registerResident` and `removeResidentFromSurgery` added to `packages/application`; `residents` Prisma model + migration and `PrismaResidentRepository` added; HTTP routes `POST /residents`, `GET /residents`, `GET /residents/:id`, `POST /surgeries/:id/residents`, `DELETE /surgeries/:id/residents/:residentId` added; e2e test proves register → assign → record-control-as-resident → removal-rejected-after-participation → removal-allowed-before-participation, plus cross-tenant rejection; no Domain changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Milestone 6 — Research capability (vertical slice)                                                                                                                          | COMPLETED | ~11 Application operations added, each a thin wrapper over the existing `research-study.ts` Domain methods; `research_studies` and `research_study_surgeries` Prisma models added (bridge table has no FK to `surgeries`, mirroring `SurgeryParticipant`); `PrismaResearchStudyRepository` added; 8 HTTP routes added for the full lifecycle; `ResearchStudy.reconstitute(...)` added to `packages/domain` during integration review, mirroring `Surgery.reconstitute`, so hydration no longer replays transition-guard methods against persisted rows; e2e test exercises the full lifecycle (create, edit, add/remove surgeries, DRAFT → IN_PROGRESS → COMPLETED → reopen → IN_PROGRESS, rejecting edits while COMPLETED) plus cross-tenant rejection                                                                                                                                                                                                                                                                                                                                                                                                |
| Milestone 7 — API security & operational hardening                                                                                                                          | COMPLETED | Fastify JSON-schema validation added on every route; `@fastify/rate-limit` added on `POST /sessions`/`POST /physicians`, keyed by forwarded client IP (`X-Forwarded-For`/`X-Real-IP`, not raw TCP source IP); `@fastify/helmet` added for security headers; `GET /health` route added; structured logging enabled via Fastify's built-in Pino logger; a Fastify AJV `removeAdditional` bug affecting `recordControl`'s discriminated `author` union was found and fixed (`removeAdditional: false`) during integration; e2e tests prove malformed-body rejection, per-forwarded-IP rate-limit triggering, and `/health` 200                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Milestones 4–7 integration** — merged in sequence into `main` from four parallel git worktrees                                                                            | COMPLETED | Full workspace quality gate (lint, format-check, typecheck, test) green with all four milestones combined: 81 Domain + 97 Application + 45 Infrastructure + 23 HTTP tests passing against a real Railway Postgres instance; `prisma migrate status` confirms no drift across all migrations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **M4–M7 conformance-review fix pass** — corrected the two actionable findings from `docs/architecture/m4-m7-conformance-review.md`, before Milestone 8 implementation began | COMPLETED | `resident.ts`/`research-study.ts` now declare request-body/params JSON schemas (previously zero — a malformed `POST /research-studies` body returned 500, not the clean 400 Milestone 7's DoD requires); `listResidents`/`getResident` added to `packages/application`, `resident.ts` now calls them instead of `ResidentRepository` directly, matching every other resource's read pattern; the Domain→wire-shape convention question was resolved as a documented decision (`application-layer-discovery.md` §8), not a refactor — both existing conventions kept, one recorded as the default for new work. `ResearchStudy.reconstitute` re-verified against the same criteria as `Surgery.reconstitute` (§7.1) — no persistence logic hidden in Domain. 5 new Application tests + 8 new HTTP tests; full workspace quality gate green: 81 Domain + 102 Application + 45 Infrastructure + 31 HTTP tests (259 total)                                                                                                                                                                                                                                 |
| Milestone 8 — Minimal physician-facing frontend (Next.js App Router, BFF)                                                                                                   | COMPLETED | `packages/web` added (Next.js App Router, Server Components by default, Server Actions for writes, `web_session` cookie relaying `api`'s own session id, centralized typed error contract). Five vertical slices built and manually + automatically verified: Authentication + Patients, Procedure Type, Surgery + Control (Aggregate with nested Control history/participants), Resident (cross-feature composition — assign/remove live on Surgery's own actions, mirroring `api`'s module boundaries), Research Study (full `DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED` lifecycle, surgery-universe management). Milestone 8 closure: `web`'s own security headers + strict nonce-based CSP (`lib/security-headers.ts`), `web` deployed to Railway (`https://web-production-c686b1.up.railway.app`) with its private-network path to `api` proven by a real login through the public URL, and a scripted Playwright walkthrough (`packages/web/e2e/full-workflow.spec.ts`) passing end to end against a real stack. 139 web tests (was 0); full workspace quality gate green: 81 Domain + 102 Application + 45 Infrastructure + 31 HTTP + 139 web = 398 tests |
| Milestone 8.5 — Physician self-registration + Resident authentication (ADR 0015/0016/0017)                                                                                  | COMPLETED | `/signup`+`/confirm-email` self-registration (ADR 0015); its email-confirmation login gate paused for MVP, machinery left dormant (ADR 0016); Resident authentication (ADR 0017) — `Session` gains `userType`; `ResidentCredentialRepository`/`TemporaryPasswordGenerator` (temp password issue/view/reset/deactivate, forced first-login change); a Resident's own scoped Surgery panel + Control record/edit-own (`packages/web/src/app/resident/*`), amending ADR 0004's Physician-only Control-modification rule. Bug found via manual browser verification (not the test suite): bodyless `authedApiRequest` calls sent a `content-type: application/json` header Fastify's parser rejects on an empty body — fixed in `lib/api-client.ts`. Full workspace quality gate green: 84 Domain + 137 Application + 63 Infrastructure + 39 HTTP + 174 web = 497 tests. Known gaps tracked, not blocking: Resident panel shows Patient/ProcedureType by id not name; no dedicated UX for a force-deactivated Resident's stale session beyond the already-enforced 401.                                                                                    |

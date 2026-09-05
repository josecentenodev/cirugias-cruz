---
name: epitaxy-project
description: Authoritative, condensed context for Epitaxy (this repository) — the problem it solves, its actors and tenancy model, its confirmed clinical/business rules, which decisions are closed vs. explicitly deferred, its approved architecture, and its "do not invent" boundaries. ALWAYS consult this skill before applying general advice from another skill (domain-driven-design, test-driven-development, monorepo-architecture, railway-implementation) to this project, and before proposing any change to the domain model, application layer, or workspace structure. This is what stops "in DDD we'd normally do X" from silently overriding a decision Epitaxy already made on purpose. If this skill's summary and the actual docs (docs/domain/DOMAIN.md, docs/decisions/, docs/architecture/) ever disagree, the docs win — this skill is an index into them, not a replacement, and should be re-read against the docs periodically since project decisions evolve over time.
---

# Epitaxy — Project Context

Epitaxy (repository `cirugias-cruz`) is a private platform for surgeons: a
physician registers, follows up, and studies their own surgeries and
patients, turning the information gathered from their own practice into
clinical research. The first clinical procedure it's built around is
**pterygium (pterigión)**. It is explicitly not a generic platform for
hospitals or clinics — the product is the individual physician's own
surgical practice.

**This skill is a condensed index, not the source of truth.** The real
source of truth is:

- [`docs/domain/DOMAIN.md`](../../../docs/domain/DOMAIN.md) — the domain
  discovery document
- [`docs/decisions/`](../../../docs/decisions/) — numbered ADRs (0001–0012
  as of this writing; some amend earlier ones — check `Status` at the top
  of each for supersession notes before treating one as current)
- [`docs/architecture/application-layer-discovery.md`](../../../docs/architecture/application-layer-discovery.md)
  — the tactical-DDD reasoning behind the current aggregate boundaries and
  Application layer design
- `packages/domain/src` and `packages/application/src` — the actual code,
  which is truth about what was implemented, even if a doc lags behind it

If anything below conflicts with those, **re-read the docs and trust
them** — this file can drift; they're what gets updated when a decision
changes.

## Actors and tenancy

- **Physician IS the Tenant.** No separate Tenant concept exists or should
  be introduced. Each physician's workspace is fully private; data never
  crosses tenant boundaries.
- **Patient** — exists only within one physician's tenant. No global
  patient identity: the same real person may be an unrelated, independent
  patient record in a different physician's tenant.
- **Resident** — belongs to exactly one physician. **There is no
  Resident ↔ Patient relationship of any kind** (this was an earlier
  model, deliberately eliminated — see ADR 0010 amending ADR 0007). A
  Resident is assigned directly to a **Surgery**, and that assignment _is_
  participation from that moment, even before any Control is recorded.
- **Platform Admin** — platform-level only, sees business metrics
  (physician count, surgery count, control count, research study count)
  and can activate/deactivate physician accounts. **Never** has access to
  clinical data of any kind.
- **Physician identification** — a Physician is identified/authenticated
  via their existing `email` field (ADR 0012; no new Domain field).
  **Built and deployed** (Milestone 3): email + password, PostgreSQL-backed
  server-side sessions (no JWT/Redis/external IdP), `registerPhysician`/
  `login`/`logout` in `packages/application`, `POST /physicians`/
  `POST /sessions`/`DELETE /sessions` in `packages/http`. Don't treat the
  auth mechanism as open — it's decided and implemented.

## Confirmed business rules (do not re-derive these from general practice)

- **Surgery**: belongs to exactly one Patient and one Procedure Type, has
  a performance date, is always in state `DONE` (no scheduling/calendar in
  this iteration), may exist with zero Controls, may have zero or more
  participating Residents. Only the Physician may modify or delete it.
- **Control**: belongs to exactly one Surgery, has observations + a
  mandatory datetime + an author (the Physician, or a Resident currently
  participating in that specific Surgery). Only the Physician may modify
  or delete it, regardless of who authored it. A Resident's participation
  in one Surgery has no bearing on any other Surgery, even for the same
  Patient. Once a Resident has recorded a Control on a Surgery, they
  cannot be removed from it — this is framed as a professional/civil
  responsibility concern, not mere technical immutability.
- **ProcedureType**: physician-owned, physician-only create/modify,
  **never deleted** — no delete method exists at all, on purpose.
- **ResearchStudy**: belongs to one physician; contains free-text
  `hypothesis`/`results`/`analysis`/`conclusion` plus a Physician-selected
  universe of Surgery ids (which may span multiple patients and multiple
  procedure types — no "same procedure type" requirement). Lifecycle is
  `DRAFT ⇄ IN_PROGRESS ⇄ COMPLETED`: DRAFT and IN_PROGRESS are both fully
  editable (text and universe); COMPLETED makes the whole study
  non-modifiable; **COMPLETED is reversible** back to IN_PROGRESS, after
  which it's fully editable again. Deletable only while DRAFT. (This
  superseded an earlier hypothesis/conclusion-confirmation-gated,
  universe-locking version — see ADR 0006's amendments.)
- **CustomField**: structure is `name` (required), `description`
  (optional), `valueType` (`NUMBER | ENUM | TEXT | DATE`), a per-type
  `constraint` only that type may carry (a `NUMBER` constraint may carry
  an optional `unit`; there is **no** `magnitude` — ADR 0020 removed it,
  the field's `name` is its clinical dimension), and a `scope`
  (`SURGERY` | `CONTROL`). Definitions live inside the `ProcedureType`
  aggregate; values embed in `Surgery`/`Control` per `scope`; persistence
  is normalized SQL (ADRs 0018–0020). Still unresolved: extra
  `valueType`s, mandatory `CONTROL`-scoped fields, cross-field
  validation — see ADR 0018's "Not decided here".

## Approved architecture

- `packages/domain` — pure TypeScript, zero dependency on Node APIs,
  Prisma, PostgreSQL, HTTP, or any framework. `Surgery` is the aggregate
  root that owns `Control` as an internal entity (no `ControlRepository`
  exists or should exist — Control has no consistency outside its
  Surgery). `ResearchStudy` is its own aggregate, referencing Surgery only
  by `{ id, physicianId }`, never embedding it. `Patient`, `Resident`,
  `ProcedureType`, `Physician` are plain Entities — not meaningfully
  "aggregates," and shouldn't be treated as needing aggregate machinery
  they have no invariant to justify.
- `packages/application` — orchestration only: loads aggregates via
  repository _ports_ (interfaces defined in Application, not Domain),
  invokes real domain methods, persists results. **Deliberately no
  `*UseCase` class-per-operation pattern** — operations are plain
  factory-function/closure-based (`operation(deps)` returns
  `(input) => Promise<Output>`), not classes, and not a generic
  `UseCase<Input, Output>` interface. No `ControlRepository`. No
  repository is injected into a domain object.
- Dependency direction is strictly `Application → Domain`; `Infrastructure
→ Application/Domain`; `HTTP → Application/Domain/Infrastructure`. Domain
  has zero outbound dependencies. `packages/infrastructure` exists
  (Milestone 2): a Prisma/PostgreSQL schema for
  Physician/Patient/ProcedureType/Surgery/Control (+ `PhysicianCredential`/
  `Session` from Milestone 3), and real repository implementations —
  proven against a real Railway Postgres instance. `SurgeryRepository`
  loads/saves the whole Surgery aggregate (Surgery + Controls +
  participating-resident ids) in one unit; `Surgery.reconstitute(...)`
  (Domain) is the hydration path a repository uses to rebuild it — see
  `docs/architecture/application-layer-discovery.md` §7 before treating
  it as a boundary change, it isn't one. `packages/http` exists
  (Milestone 3, Fastify): write-only routes for the core loop + auth, all
  protected routes resolving tenant identity from the session cookie via
  a `requireAuth` preHandler — never from client input. **Still missing
  at every layer**: read/list endpoints for any resource; Resident
  registration/removal persistence (`residents` table doesn't exist yet);
  ResearchStudy persistence at all (no table exists). No `ControlRepository`
  should be introduced for any of this — Control stays reachable only
  through `SurgeryRepository`. The project is deployed on Railway (see
  Deployment/hosting below) but has no public domain and no frontend yet.
- Tooling baseline: pnpm workspaces (`workspace:*` protocol), Vitest per
  package (`"test": "vitest run"`), a flat ESLint config +
  Prettier at the repo root, and a root `check` script chaining
  `lint && format:check && typecheck && test`.
- **Frontend (decided, not yet built)**: Next.js, App Router, in a new
  `packages/web`. Runs as a **BFF** — its own server calls `packages/http`
  server-to-server (over Railway's private network where possible, not a
  public CORS-enabled API), so the session cookie is same-origin between
  the browser and `web` and never needs `SameSite=None`. Server Components
  are the default; Client Components (`"use client"`) are the exception,
  reserved for forms and genuinely interactive leaf components — do not
  reach for client-side state/effects for anything a Server
  Component/Server Action can do. Reads happen in Server Components (SSR,
  no client-side fetch waterfall); writes happen through Server Actions
  that call `packages/http`. Structure is feature-based with route groups
  (mirroring the backend's Patient/ProcedureType/Surgery/Resident/Research
  vertical slices), not a generic `components/`+`pages/` split. See
  `docs/architecture/frontend-architecture-discovery.md` for the full
  reasoning once it exists.

## Explicitly deferred / unresolved — do not invent answers

- CustomField's value model (see above).
- Surgery/Patient `metadata` shape.
- Final Procedure Type structure beyond `name`/`description`/`technique`.
- Pterygium-specific clinical measurements and interpretation rules
  (pending a physician consultation — do not guess clinical content).
- Notifications/reminders, payments/subscriptions, observability, CI/CD,
  backup strategy, regulatory/compliance implementation.
- Whether `packages/http` should ever be reachable by anything other than
  `packages/web`'s server (public CORS vs. Railway-private-only) — leans
  toward private-only given the BFF decision, but not yet formally closed
  in `docs/architecture/ROADMAP.md`'s Planning Decisions.
- Backup/recovery policy for the Postgres instance (Railway plan-tier
  dependent, not decidable from the repo).

**Resolved, do not reopen**: HTTP framework (Fastify, built,
`packages/http`), the authentication mechanism (email + password +
server-side session, ADR 0012, built), frontend framework (Next.js App
Router, BFF pattern — see "Approved architecture" above), and Railway as
the permanent host. Read/Query, Resident, and Research are all
**MVP-required** by explicit product decision — do not treat them as
optional/Post-MVP; see `docs/architecture/ROADMAP.md`'s MVP Definition.

## Hard "do not invent" rules

1. Don't reintroduce a Resident ↔ Patient relationship in any form — it
   was deliberately removed (ADR 0010).
2. Don't add CustomField value semantics, clinical measurements, or
   interpretation structure that isn't already written down.
3. Don't add Surgery states beyond `DONE`, or any scheduling concept.
4. Don't add Research Study locking/versioning/publishing/audit behavior,
   or make `COMPLETED` irreversible — reopening is a confirmed, permanent
   feature of the design.
5. Don't give the Platform Admin any clinical-data access.
6. Don't create a `ControlRepository`, embed `Surgery` inside
   `ResearchStudy`, or otherwise cross an already-established aggregate
   boundary — see `docs/architecture/application-layer-discovery.md` for
   the reasoning if a change here seems tempting.
7. Don't re-litigate closed platform/framework choices merely because a
   different one would be common practice: Fastify (`packages/http`),
   Prisma/PostgreSQL (`packages/infrastructure`), Next.js App Router with
   the BFF pattern (`packages/web`, not yet built), and Railway hosting
   are all decided. Don't introduce a second HTTP framework, a second ORM,
   a different frontend framework, or a public CORS-facing API in place
   of the BFF pattern without an explicit new decision.
8. Don't build `packages/web` as a client-heavy SPA — Server Components
   are the default; `"use client"` is the exception for forms/interactive
   leaf components only. Don't reach for Redux/Zustand/React Query-style
   client-state machinery for data a Server Component could fetch
   directly — that's exactly the "as little React as possible" instruction
   this decision exists to honor.
9. Don't add optimistic locking, a version column, or participant-diffing
   logic to `PrismaSurgeryRepository.save()` to fix its known
   participant-replacement lost-update risk — it's deliberately deferred
   until a real multi-writer/concurrent-editing requirement exists (see
   `docs/architecture/ROADMAP.md` § Risks and Unknowns).

## How to use this alongside the other project skills

When `domain-driven-design`, `test-driven-development`,
`monorepo-architecture`, or `railway-implementation` would otherwise
recommend something general, check this file (and, if needed, the real
docs it indexes) first. If their general guidance and Epitaxy's documented
decision agree, proceed normally. If they conflict, say so explicitly —
name what the general practice would suggest, name what Epitaxy already
decided and why (cite the ADR/doc if you can), and defer to the documented
decision unless the user is actively asking to reconsider it.

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
- [`docs/decisions/`](../../../docs/decisions/) — numbered ADRs (0001–0011
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
  Resident is assigned directly to a **Surgery**, and that assignment *is*
  participation from that moment, even before any Control is recorded.
- **Platform Admin** — platform-level only, sees business metrics
  (physician count, surgery count, control count, research study count)
  and can activate/deactivate physician accounts. **Never** has access to
  clinical data of any kind.

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
  (optional), `unit` (required), `magnitude` (required) — and nothing
  more. Value representation, unit/magnitude semantics, and how
  definitions attach to Procedure Types/Surgeries/Controls are
  **explicitly unresolved**. Do not implement or assume any of that.

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
  repository *ports* (interfaces defined in Application, not Domain),
  invokes real domain methods, persists results. **Deliberately no
  `*UseCase` class-per-operation pattern** — operations are plain
  factory-function/closure-based (`operation(deps)` returns
  `(input) => Promise<Output>`), not classes, and not a generic
  `UseCase<Input, Output>` interface. No `ControlRepository`. No
  repository is injected into a domain object.
- Dependency direction is strictly `Application → Domain`; Domain has zero
  outbound dependencies. Infrastructure (Prisma/PostgreSQL/HTTP) does not
  exist yet — don't introduce it speculatively.
- Tooling baseline: pnpm workspaces (`workspace:*` protocol), Vitest per
  package (`"test": "vitest run"`), a flat ESLint config +
  Prettier at the repo root, and a root `check` script chaining
  `lint && format:check && typecheck && test`.

## Explicitly deferred / unresolved — do not invent answers

- CustomField's value model (see above).
- Surgery/Patient `metadata` shape.
- Final Procedure Type structure beyond `name`/`description`/`technique`.
- Pterygium-specific clinical measurements and interpretation rules
  (pending a physician consultation — do not guess clinical content).
- HTTP framework, frontend framework, authentication/authorization
  implementation, notifications/reminders, payments/subscriptions,
  observability, CI/CD, backup strategy, regulatory/compliance
  implementation.

Railway, PostgreSQL, Prisma, pnpm Workspaces, and TypeScript/Node.js are
the only infrastructure/tooling decisions already closed at the platform
level (see the README and ADRs) — everything above them in the stack is
still open.

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
7. Don't introduce Prisma, a database schema, an HTTP layer, or a frontend
   framework because it would be convenient to have — those are explicitly
   undecided.

## How to use this alongside the other project skills

When `domain-driven-design`, `test-driven-development`,
`monorepo-architecture`, or `railway-implementation` would otherwise
recommend something general, check this file (and, if needed, the real
docs it indexes) first. If their general guidance and Epitaxy's documented
decision agree, proceed normally. If they conflict, say so explicitly —
name what the general practice would suggest, name what Epitaxy already
decided and why (cite the ADR/doc if you can), and defer to the documented
decision unless the user is actively asking to reconsider it.

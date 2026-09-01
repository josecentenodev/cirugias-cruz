# Milestones 4–7 — Architecture Conformance Review

> This is a review document, not an implementation task list. It checks
> what M4–M7 actually built against what `application-layer-discovery.md`,
> the ADRs, and `ROADMAP.md`'s own Definition of Done for each milestone
> committed to — before Milestone 8 (frontend) starts consuming this API
> as a stable contract. Passing tests proved behavior on the paths those
> tests exercise; it does not by itself prove the implementation matches
> the documented architecture on paths nothing exercised (e.g. a
> malformed request body with no schema to reject it). This review exists
> to close that gap. No code was changed to produce this document.
>
> **Update (post-review fix pass, before Milestone 8 implementation
> began)**: findings 2.1 and 2.2 have been corrected; this document is
> kept as the historical record of what was found and how it was fixed,
> not edited to hide that the gaps existed. See each finding's own
> "Resolution" note below, and §4 for the updated disposition.

---

## 1. Method

For each of Milestones 4–7, the actual route/operation code in
`packages/http/src/routes/*.ts` and `packages/application/src/**` was
read directly and checked against:

- `docs/architecture/application-layer-discovery.md` (the Application
  layer's own architectural rules — ports in Application, thin
  factory-function operations, no `*UseCase` classes, HTTP is
  translation-only).
- The relevant ADRs (0006 Research lifecycle, 0007 Resident
  immutability, 0010 Resident participation scope).
- Each milestone's own **Scope** and **Definition of Done** as recorded
  in `ROADMAP.md`.

Five findings came out of this. None of them is a correctness bug the
test suite would have caught — each is either a gap the test suite
never tried to trigger, or a design inconsistency that still produces
correct behavior today but creates avoidable cost for Milestone 8.

---

## 2. Findings

### 2.1 — Milestone 7's request-validation scope was not actually applied to Milestone 5/6 routes (HIGH)

**Claimed** (`ROADMAP.md`, Milestone 7 Definition of Done): _"a malformed
request body returns a clean 400 (not a 500)"_, achieved via
"Fastify JSON-schema on every route body/params."

**Actual**: only `auth.ts` (2 schemas) and `core-loop.ts` (5 schemas)
declare a `schema.body`. `resident.ts` and `research-study.ts` — both
merged into `main` after Milestone 7's own routes were written — declare
**zero** request-body schemas.

```bash
$ grep -c "schema:" packages/http/src/routes/*.ts
auth.ts:2
core-loop.ts:5
health.ts:0
research-study.ts:0
resident.ts:0
```

**Concrete failure this causes**: `POST /research-studies` reads
`request.body.hypothesis` directly. If the request has no body at all
(no `Content-Type: application/json`, or an empty body — an entirely
plausible client bug, not an attack), `request.body` is `undefined`, and
`request.body.hypothesis` throws a `TypeError` _inside_ the route's
`try` block. `replyForError` only recognizes `DomainError` and
`NotFoundError` — a `TypeError` falls through to its `console.error` +
`500` branch. The same shape of bug exists in `resident.ts`'s
`POST /residents`. This is exactly the failure mode Milestone 7's DoD
says is closed — it is not, for these two route files.

**Why the test suite didn't catch it**: `resident.test.ts` and
`research-study.test.ts` (the e2e suites) only exercise well-formed
requests — they prove the happy path and domain-rule rejections, not
malformed-input handling. `security.test.ts` (Milestone 7's own suite)
only tests routes that existed when it was written (`core-loop.ts`,
`auth.ts`) — it was never re-run against `resident.ts`/`research-study.ts`
because those files didn't exist in the Milestone 7 worktree.

**Recommendation**: add `schema.body`/`schema.params` to every route in
`resident.ts` and `research-study.ts`, mirroring the pattern already
established in `core-loop.ts` (structural validation only — required
fields and primitive types, never a Domain business rule). This is a
small, mechanical fix (the field shapes are already known from each
route's own `interface` declarations) and should land as its own commit
**before** Milestone 8 starts treating this API as a stable, trustworthy
contract — a frontend Server Action that forwards a malformed body today
would get a 500 with no actionable detail, which Milestone 8's error
design (see the companion `milestone-8-design.md`, §7) explicitly wants
to avoid having to special-case.

**Resolution**: `resident.ts` (`registerResidentBodySchema` + params
schemas on every route) and `research-study.ts` (a shared
`researchStudyTextFieldsBodySchema` for the create/PATCH bodies —
intentionally with no `required` array, since every text field is
optional at the Domain level — plus `addSurgeryBodySchema`,
`statusBodySchema`, and params schemas on every route) now declare
schemas mirroring `core-loop.ts`'s existing style. The exact repro case
(`POST /research-studies` with no body at all) and seven other malformed-
input cases across both files are covered by new tests in
`packages/http/src/e2e/security.test.ts` ("Request validation" describe
block), each asserting `400`, not `500`. Verified: `grep -c "schema:"
packages/http/src/routes/*.ts` now shows `resident.ts:5` and
`research-study.ts:7` (all previously 0).

### 2.2 — Resident read routes bypass the Application layer (MEDIUM)

**Established pattern** (Milestone 4, `core-loop.ts`): `GET /patients`,
`GET /patients/:id`, and the ProcedureType/Surgery equivalents each call
an Application operation (`listPatients`, `getPatient`, ...). The
"does this resource belong to the caller's tenant, or is it a 404"
check lives once, in Application (`get-patient.ts` etc.), not in HTTP.

**Actual** (Milestone 5, `resident.ts`):

```ts
app.get("/residents", auth, async (request, reply) => {
  const residents = await deps.residentRepository.findByPhysicianId(...);
  ...
});

app.get<{ Params: { id: string } }>("/residents/:id", auth, async (request, reply) => {
  const resident = await deps.residentRepository.findById(request.params.id);
  if (!resident || resident.physicianId !== request.physicianId) {
    return await reply.code(404).send({ error: `Resident ${request.params.id} was not found` });
  }
  ...
});
```

There is no `listResidents`/`getResident` Application operation. The
HTTP route talks to `ResidentRepository` directly (available to it only
because `AppDeps` happens to expose every repository), and re-implements
the same "not found or foreign tenant → 404" check that
`get-patient.ts`/`get-surgery.ts` already implement once, in Application,
via `NotFoundError` + `replyForError`.

**Why this matters, concretely**: this is not currently a bug — the
check is correct — but it is the same tenant-boundary logic duplicated
in a second place, in a layer (`packages/http`) that
`application-layer-discovery.md` explicitly scopes to translation only.
If that check's shape ever changes (e.g. a soft-delete flag is added to
`Resident` and "not found" needs to also mean "deleted"), one of the two
copies is the one that will silently not get updated.

**Recommendation**: add `listResidents`/`getResident` Application
operations mirroring `listPatients`/`getPatient` exactly, and have
`resident.ts` call them instead of `deps.residentRepository` directly.
Small, mechanical, no behavior change — purely closes the layering gap
before Milestone 8 builds a `features/residents/queries.ts` that will
assume (reasonably) that every read goes through Application the same
way Patient/ProcedureType/Surgery do.

**Resolution**: `listResidents`/`getResident` were added to
`packages/application/src/resident/` — mirroring `listPatients`/
`getPatient` field-for-field, including the same `NotFoundError`
"doesn't exist or belongs to another tenant" check. `resident.ts` now
calls these instead of `deps.residentRepository` directly; `AppDeps`
required no change (`residentRepository` was already there, the
Application operations just now sit between the route and it, as with
every other resource). New Application-level unit tests
(`list-residents.test.ts`, `get-resident.test.ts`) prove the
orchestration responsibility now lives in Application, mirroring
`list-patients.test.ts`/`get-patient.test.ts` exactly; the existing
`resident.test.ts` e2e suite (already covering list/get + cross-tenant 404) continues to pass unchanged, proving the fix is behavior-preserving.

### 2.3 — Two different conventions for "who converts a Domain entity to a wire shape" (MEDIUM at the time — resolved as a deliberate decision, not a refactor)

At review time, three different answers existed for the same question
across M1–M6 (see the original three-row comparison this section used
to show). **After 2.2's fix, M5 (Resident) now goes through
`listResidents`/`getResident` returning a raw Domain entity, exactly
like Patient/ProcedureType/Surgery** — so the actual count is now two
conventions, not three:

| Resources                                           | Application returns                               | HTTP does                                                                               |
| --------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Patient / ProcedureType / Surgery / Resident (M1–5) | the raw Domain entity                             | a dedicated `serializePatient`/`serializeSurgery`/`toResidentDto` function per resource |
| Research Study (M6)                                 | an already-flattened DTO (`ResearchStudySummary`) | passed straight through, untouched                                                      |

**Decision (see `application-layer-discovery.md` §8 for the full
reasoning)**: keep both — no refactor was made to either side. This is
not a duplication risk (each resource's mapping lives in exactly one
place, not copied), and `milestone-8-design.md` §6 already assumes and
absorbs per-resource variation in its DTO/mapper layer, so nothing about
Milestone 8 was blocked by leaving this as-is. Rewriting either
direction — the four-resource majority to match Research Study, or
Research Study to match the majority — would have been a refactor
motivated purely by uniformity, with no defect to justify it, which was
explicitly out of scope for this fix pass. **What was decided is
prospective only**: new Application read operations going forward should
return an already-flattened DTO (Research Study's convention), not a raw
Domain entity — see `application-layer-discovery.md` §8 for why.

### 2.4 — Research Study status-transition routing lives in HTTP, not Application (LOW — acceptable as documented, but was undocumented)

`POST /research-studies/:id/status` reads the study's _current_ status
(via `getResearchStudy`) and picks one of three Application operations
(`moveResearchStudyToInProgress`/`completeResearchStudy`/
`reopenResearchStudy`) based on `{ current, to }`. This logic lives in
the HTTP route handler itself, with a code comment explaining the
mapping — but nothing in `ROADMAP.md`'s Milestone 6 scope or DoD
mentions this design choice.

**Why this is acceptable, not a violation**: no Domain business rule is
duplicated here — the route only decides _which already-existing,
already-tested Application operation to call_, and each of those
operations still fully re-delegates to Domain for the actual transition
guard (an invalid `{current, to}` combination Domain would also reject
is caught here as a 400 one level earlier, which is strictly a UX
improvement, not a rule invented in HTTP). This is different in kind
from re-implementing a business rule.

**Recommendation**: no code change required. Documented here so it's a
recorded, intentional design choice rather than something Milestone 8 or
a future reader has to rediscover by reading the route file. If a
second "pick one of N operations based on current state" case ever
appears elsewhere, that would be the signal to extract a single
`updateResearchStudyStatus` Application operation instead of repeating
this pattern a second time in HTTP.

### 2.5 — There is no 403 anywhere in this API, by design (INFORMATIONAL — confirmed consistent, not a defect)

Checked across every route and every Application operation: the API
never returns `403 Forbidden`. The two authorization-failure shapes are:

- **Read of a resource belonging to another tenant → `404`**
  (`get-patient.ts`, `get-surgery.ts`, `get-research-study.ts`,
  `resident.ts`'s inline check — see 2.2). Deliberate anti-enumeration
  design, stated explicitly in each operation's own doc comment: a
  caller must never be able to distinguish "doesn't exist" from
  "belongs to someone else."
- **Write against a resource belonging to another tenant → `400`**, via
  a `DomainError` thrown by the Domain method's own tenant assertion
  (e.g. `ResearchStudy.addSurgery` throwing when the acting physician
  isn't the owner) or an equivalent Application-level check
  (`recordControl`'s explicit `surgery.physicianId === physicianId`
  check, `application-layer-discovery.md` §4.3's `registerSurgery`
  cross-reference check).

This is consistent across every milestone reviewed — not a finding
requiring correction. It is recorded here because it is exactly the
kind of implicit contract a frontend error-handling layer (`milestone-8-design.md`,
§7) needs to be told explicitly rather than infer from testing: **there
is no `403` case to design a UI for**; every authorization failure a
physician can trigger through the UI is either a `404` (something looks
absent) or a `400` (something was rejected, with a message) — and the
one `401` case (no/expired session) is handled uniformly by
`requireAuth`, never per-route.

---

## 3. What was not a problem

Explicitly checked and found correctly done, worth recording so it
isn't re-litigated:

- **Tenant identity resolution**: every route across all of M4–M7 reads
  `request.physicianId` — set only by `requireAuth` from the session
  cookie — and never from the request body/params/query. No exception
  found in any of the four milestones' routes.
- **The AJV `removeAdditional` fix** (`build-app.ts`) applies globally
  to the Fastify instance, so it correctly protects `resident.ts`'s and
  `research-study.ts`'s bodies too, even though those files have no
  schemas of their own yet (finding 2.1) — the fix and the missing
  schemas are unrelated concerns that happened to be found in the same
  integration pass.
- **Rate limiting** (`forwardedClientIp`) is scoped correctly to
  `POST /sessions`/`POST /physicians` only, per Milestone 7's stated
  scope — it was not accidentally left global or accidentally applied
  to unrelated routes.
- **Migration/schema consistency**: `prisma migrate status` shows zero
  drift with all four milestones' models present; the M6 agent's
  handling of the stale-worktree base (Section "Errors and fixes" in
  prior session history) did not leave any inconsistency in the merged
  result.

---

## 4. Disposition

**All actionable findings are now resolved.** Findings 2.1 and 2.2 were
fixed as small, mechanical commits — no design change beyond what each
finding's own Recommendation already specified, no existing test
rewritten (only extended) — closing the gap between `ROADMAP.md`'s
claimed M7 Definition of Done and the code, before Milestone 8 begins
consuming this API. Finding 2.3 was resolved as a deliberate,
documented decision (`application-layer-discovery.md` §8) rather than a
refactor — both conventions stay, a direction is recorded for new work.
Findings 2.4 and 2.5 required no code change, only the documentation
this review itself provides — confirmed still accurate after the 2.1/2.2
fixes (neither route file's status-routing or 403-free error model
changed).

**Verification after the fixes**: full workspace quality gate (lint,
format-check, typecheck) green; 81 Domain + 102 Application + 45
Infrastructure + 31 HTTP tests passing (259 total) — Infrastructure and
HTTP against a real Railway Postgres instance. Application gained 5
tests (`list-residents.test.ts`, `get-resident.test.ts`); HTTP gained 8
(`security.test.ts`'s new "Request validation" cases for
`resident.ts`/`research-study.ts`); Domain and Infrastructure are
unchanged, as expected — neither finding touched those layers.

This review does not change any milestone's `COMPLETED` status in
`ROADMAP.md` — that remains a call for the product owner, not something
this document decides unilaterally. See `ROADMAP.md`'s Risks and
Unknowns section for the pointer to this review.

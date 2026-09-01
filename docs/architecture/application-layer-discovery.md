# Application Layer — Discovery

> This is an architecture document, not a product-decision document. It
> records the tactical-DDD reasoning performed against the actual code in
> `packages/domain/src`, and the Application Layer responsibilities that
> follow from it. It does not introduce new business rules — everything
> here is either quoted from `docs/domain/DOMAIN.md` / `docs/decisions/`,
> or observed directly by reading the domain source and tests.

---

## 1. How the model arrived here

### 1.1 The Patient ↔ Resident relationship was removed, not merely refined

The domain went through two shapes for Resident assignment:

- **Original shape** (captured in ADR 0007, still on disk as historical
  record, superseded): a Resident was assigned to a **Patient**. Clinical
  "participation" in a specific Surgery was described as a separate fact
  layered on top of that assignment. This required `Patient` to track
  `assignedResidentIds`, and required an `unassignResident(residentId,
hasPreservedParticipation: boolean)` method on `Patient` — where the
  `hasPreservedParticipation` boolean had to be computed by scanning every
  Surgery belonging to that Patient, in a **different aggregate**, and
  passed in from outside. That earlier implementation round also had a
  standalone domain service, `hasResidentParticipatedInAnySurgery(surgeries,
residentId)`, that existed for no reason other than to compute that
  boolean across aggregates.
- **Current shape** (ADR 0010, amending ADR 0007): "There is no Resident ↔
  Patient relationship of any kind. A Resident is never assigned to a
  Patient." Assignment and clinical participation are now the same act,
  and both happen directly on `Surgery` (`Surgery.assignResident` /
  `Surgery.removeResident`, `packages/domain/src/surgery/surgery.ts`
  lines 100–116).

**Why this was the right change, read from the code itself:** the moment
assignment happened on `Surgery` instead of `Patient`, the
`hasPreservedParticipation` cross-aggregate service disappeared entirely.
`Surgery.removeResident` now calls `this.hasResidentParticipated(residentId)`
(line 109) — a method that scans `this.controls_`, which is _already
inside the same object_. What used to be a cross-aggregate query became a
private field read. That is not a stylistic improvement; it is the
concrete, observable signal that the earlier boundary (Patient owning
resident assignment) was wrong, and the current one (Surgery owning it) is
right: **the invariant "cannot remove a resident who has recorded
participation" only needs data that Surgery already has.** A domain
service coordinating two aggregates was a symptom of a boundary drawn in
the wrong place, not a legitimate application-layer abstraction. There is
no such service in the current code (`resident-participation-service.ts`
was deleted as part of the ADR 0010 refactor), and there is no reason to
re-introduce one.

`Resident` itself still carries a doc-comment fragment referencing
`Patient.assignResident`, which no longer exists on `Patient`
(`patient.ts` has no such method — its class comment correctly states
"Patient does not track residents in any way"). This is a known,
already-identified stale comment from the Tactical DDD Challenge. It is
recorded as follow-up cleanup in §6 of this document and is **not**
touched here.

### 1.2 Why Resident participation had to end up on Surgery, specifically

DOMAIN.md §1b states the responsibility rule directly: "the resident's
unit of clinical responsibility is the Surgery, not the Patient", and
gives the worked example — Resident X participates in Surgery A by
recording data, and that fact does not carry over to Surgery B for the
same Patient. This is not a modeling preference; it is the literal
business rule. Once that's true, the _only_ object that can decide "is
this resident currently allowed to record a Control here" and "has this
resident already recorded one here" is the Surgery itself — no other
object in the domain has both the roster of participating residents and
the list of Controls in the same place at the same time.

### 1.3 Why Control cannot be an independently consistent Aggregate

Three concrete places in `surgery.ts` depend on Control and Surgery
sharing one consistency boundary — not as a design preference, but
because the check literally cannot be performed correctly otherwise:

- `recordControl` (lines 129–143): a resident-authored Control is valid
  only if the author's `residentId` is currently in
  `this.participatingResidentIds_`. A `Control` object has no way to
  answer that on its own — the roster lives on `Surgery`.
- `removeResident` (lines 106–116): decides whether a resident can be
  removed by calling `hasResidentParticipated`, which scans
  `this.controls_` (lines 118–123). If `Control` were independently
  fetchable/persistable, this check would require a query across
  potentially-stale, separately-loaded data, with a race window between
  "check" and "remove" that the aggregate boundary is specifically
  designed to close.
- `modifyControl` / `deleteControl` (lines 153–177): reuse
  `this.physicianId_` for the tenant check — `Control` itself stores no
  `physicianId` at all. It has no independent identity from a tenancy
  perspective; it borrows Surgery's.

If `Control` were its own aggregate (its own repository, fetched and
saved independently of `Surgery`), the participation-preservation
invariant (DOMAIN.md §10, ADR 0010) would become **unenforceable
atomically** — a caller could load a `Surgery` with a stale
`participatingResidentIds` snapshot, decide a removal is safe, and race
against a concurrent Control being recorded through a separately-loaded
Control. This is the textbook justification for a nested/internal entity
rather than a sibling aggregate, and it comes directly from a rule the
product owner explicitly considers legally/professionally significant,
not merely technical.

### 1.4 Why Surgery + Control form a real consistency boundary (not just a style choice)

Applying the test in §2 below: does an invariant span both objects and
require atomic enforcement? Yes, three separate times (§1.3). That is
what distinguishes Surgery/Control from "two classes that happen to be
related" — there is no way to satisfy DOMAIN.md's confirmed rules by
checking Control and Surgery independently, in two different
transactions, against two different repositories.

### 1.5 Why ResearchStudy is its own Aggregate, and why it does not embed Surgery

`ResearchStudy` (`research-study.ts`) has its own invariant that spans two
kinds of state it owns directly: free-text fields and a
`Set<string>` of surgery ids. `assertModifiable` (lines 88–92) is called
from every mutator — `updateHypothesis/Results/Analysis/Conclusion` _and_
`addSurgery`/`removeSurgery`. The rule "nothing about this study — text or
membership — changes once `COMPLETED`, and everything becomes editable
again after `reopen()`" (DOMAIN.md §11, ADR 0006 Amendment 2) governs both
kinds of state as one unit. That is what makes ResearchStudy an aggregate
in the meaningful sense, not merely a labeled root.

It explicitly does **not** embed `Surgery`. `addSurgery` takes
`{ id: string; physicianId: string }` (line 123) — a plain shape, not a
`Surgery` instance — and the class comment states the reasoning: "the two
evolve independently and a study's universe is just a set of references."
This is the correct application of aggregate design, not an
accidental omission: a `ResearchStudy` reaching into `Surgery`'s internals
(or holding a live reference to a `Surgery` object) would let a change to
one aggregate silently affect another outside of any transaction boundary,
and would make it impossible to reason about "how big is a ResearchStudy"
independently of how many Controls its surgeries happen to have
accumulated.

### 1.6 Why Patient and Resident are Entities, not behaviorally meaningful Aggregates

Reading `patient.ts` and `resident.ts` in full: both are `id` +
`physicianId` + `Person` (+ `observations` for Patient) + one or two
tenant-scoping methods. Neither owns a child entity. Neither has a
cross-object invariant to enforce. `Patient.sameIdentityAs` and
`Resident.belongsToTenant` are identity/tenancy checks, not consistency
rules spanning multiple objects. Nothing in DOMAIN.md ties an invariant to
"the set of things reachable from a Patient" or "from a Resident" —
because, after ADR 0010, nothing is reachable from either. Calling them
"Aggregate Roots" is not incorrect, but it adds no information beyond
"this has an id" — see §2 for why identity alone doesn't earn the term.

### 1.7 Why ProcedureType needs no aggregate machinery

`procedure-type.ts`'s one interesting rule — "never deleted" (ADR 0011) —
is enforced by the simplest possible mechanism available: the class
exposes no `delete` method at all. No guard clause, no aggregate
coordination, no state flag. `modify` (lines 71–89) reuses the same
`assertActingPhysicianOwnsResource` tenant check used everywhere else.
There is no invariant spanning multiple objects here, so there is nothing
for "aggregate" reasoning to add.

### 1.8 Boundaries that were considered and rejected

- **Patient owning Resident assignment** — rejected by ADR 0010; see §1.1.
  Concretely disproven by the disappearance of the cross-aggregate
  `hasResidentParticipatedInAnySurgery` service once the boundary moved.
- **Control as an independent aggregate with its own repository** —
  never implemented; rejected implicitly by never introducing a
  `ControlRepository` and explicitly reasoned about in §1.3. This
  document is also where that rejection is made explicit for the first
  time, rather than left as a silent omission.
- **ResearchStudy embedding Surgery** — never implemented; rejected by
  the `{ id, physicianId }` reference shape and the class comment already
  in the code (see §1.5).
- **A `Research Study` universe requiring a matching Procedure Type
  across its surgeries** — this was an actual constraint in an earlier
  discovery draft, retired by ADR 0006 Amendment 1. It's not an
  aggregate-boundary question, but it's recorded here because it shaped
  what `ResearchStudy.addSurgery` does _not_ check (no ProcedureType
  lookup at all, anywhere in the class).

---

## 2. The Aggregate test actually used

> An Aggregate boundary is justified when a genuine domain invariant spans
> multiple objects and must be enforced atomically within one consistency
> boundary.

```text
Entity
    = identity + lifecycle/domain behavior

Aggregate
    = consistency boundary around one or more Entities/Value Objects
      where invariants must be enforced atomically
```

**Identity alone does not justify an Aggregate** because every one of
`Patient`, `Resident`, and `ProcedureType` has identity (`id` +
`physicianId`) and lifecycle (`create`, and for ProcedureType, `modify`),
and none of them needed to become anything more than that to satisfy
DOMAIN.md. If "has an id" were sufficient to call something an aggregate,
the term would apply uniformly to every class in the package and stop
distinguishing anything — which is exactly why Surgery/Control's _actual_
cross-object, atomically-enforced rules (§1.3) are worth calling out as
categorically different from Patient's or Resident's single-object
validation.

Concretely, in this codebase: `Surgery` is a consistency boundary because
three specific invariants (§1.3) cannot be checked correctly if `Control`
is fetched/saved independently. `ResearchStudy` is a consistency boundary
because one invariant (§1.5) governs two kinds of state it owns together.
`Patient`, `Resident`, and `ProcedureType` are Entities with identity and
their own single-object validation, and nothing more — which is a correct
and sufficient outcome, not an unfinished one.

---

## 3. Resulting domain boundaries

```text
Surgery                                  (Aggregate)
  └── Control                            (Entity, internal — no independent repository)

ResearchStudy                            (Aggregate)
  └── surgeryIds: Set<string>            (identity references only, not embedded Surgeries)

Patient                                  (Entity)
Resident                                 (Entity)
ProcedureType                            (Entity)
Physician                                (Entity — the Tenant itself; no domain behavior beyond identity + Person fields)
```

### Surgery / Control

1. **What it owns**: its own attributes (`patientId`, `procedureTypeId`,
   `performedAt`, always-`DONE` `state`), the set of currently
   participating Resident ids, and the full list of `Control` entities
   recorded against it.
2. **What invariant justifies the boundary**:
   - Resident authorship must be checked against Surgery's own
     participation roster (`recordControl`, line 129–138).
   - A resident with recorded participation (≥1 authored Control) cannot
     be removed (`removeResident` + `hasResidentParticipated`, lines
     106–123).
   - Control modification/deletion is authorized through Surgery's own
     tenant boundary — `Control` has no `physicianId` of its own
     (`modifyControl`/`deleteControl`, lines 153–177).

   All three require the same in-memory object to hold both the roster
   and the Control history at the moment of the check — that is
   precisely "atomic enforcement within one consistency boundary."

3. **What it deliberately does NOT own**: `Patient`, `ProcedureType`, or
   `Resident` themselves — only their ids. It does not verify that a
   `patientId` or `procedureTypeId` it's given actually exists or belongs
   to the same tenant; `Surgery.create` only checks that the strings are
   non-empty (lines 36–52). It does not verify a `residentId` passed to
   `assignResident` corresponds to a real Resident, or one belonging to
   this tenant — `assignResident` (line 100) only checks
   `actingPhysicianId` against its own `physicianId`, nothing about the
   resident.
4. **What Application must therefore orchestrate externally**:
   - Confirm a Patient and ProcedureType referenced when creating a
     Surgery actually exist and belong to the acting physician's tenant
     (Surgery cannot do this itself — it has no repository access, by
     design).
   - Confirm a Resident referenced in `assignResident` actually exists
     and belongs to the same tenant as the Surgery — this is a genuine
     gap in what the aggregate's own signature can check (see §4.3), not
     a duplicated invariant.

### ResearchStudy

- **COMPLETED makes the study immutable**: `assertModifiable` (lines
  88–92) throws for every mutator once `status_ === "COMPLETED"`.
- **`reopen()` restores mutability**: `reopen` (lines 159–167) is the only
  way back to `IN_PROGRESS` from `COMPLETED`; once there, the same
  `assertModifiable` check simply passes again — there is no separate
  "was previously completed" flag lingering anywhere. Reopening is a full,
  clean return to a modifiable state, not a partially-locked one.
- **Surgery membership is part of the same consistency boundary**:
  `addSurgery`/`removeSurgery` are gated by the exact same
  `assertModifiable` call as the text mutators (lines 123–136) — one
  method, one check, covering both kinds of state.
- **Surgery itself must not be embedded**: confirmed in code (`{ id,
physicianId }` shape, not `Surgery`) and in the class doc comment
  (lines 16–19).

**What it deliberately does NOT own**: any knowledge of what a referenced
Surgery actually looks like beyond the `id`/`physicianId` it was given at
`addSurgery` time — no ProcedureType, no Controls, no performedAt date.

**What Application must therefore orchestrate externally**: load the real
`Surgery` (to get its authentic `physicianId` — never trust a
caller-supplied one), then call `ResearchStudy.addSurgery` with that data.
`ResearchStudy.addSurgery` itself still performs the tenant-match
assertion (line 126) — Application's job is only to supply truthful
input, not to re-implement the check.

### Patient / Resident

Both are Entities: identity (`id` scoped to `physicianId`) + lifecycle
(`create`) + their own single-object field validation. Calling them
"Aggregate Roots" would currently add terminology without adding domain
meaning, because neither owns another object and neither has a
cross-object invariant — the term "aggregate" only earns its keep when it
distinguishes "must be enforced atomically together" from "just has an
id," and for these two classes there is nothing on the other side of that
distinction.

### ProcedureType

Entity: identity + `modify` (tenant-checked) + the absence of a `delete`
method as the enforcement mechanism for "never deleted." No cross-object
invariant exists, so no aggregate reasoning applies.

---

## 4. Consequences for the Application Layer

Application's job, stated precisely for this codebase rather than
generically: **load the right aggregate(s) by id, supply them with
truthful data about anything they can't verify themselves (because they
correctly have no repository access), invoke the domain method that
already knows how to enforce the actual business rule, and persist the
result.** Nothing more.

### 4.1 What Application may do

- Load domain objects via repository ports, by id.
- Coordinate more than one repository when an operation genuinely spans
  more than one aggregate (see 4.3's Resident example, and the
  ResearchStudy/Surgery example in §3).
- Perform checks that are conceptually about the domain but that no
  single aggregate can perform itself because it structurally lacks
  access to the other aggregate's data (see 4.3).
- Invoke domain behavior (`surgery.assignResident(...)`,
  `study.addSurgery(...)`, etc.) — the domain method remains the one
  place the actual rule is encoded.
- Persist the resulting aggregate state via a `save` port call.
- Translate primitive/DTO input into the ids and values the domain
  methods expect, and translate the resulting aggregate's public getters
  into a plain output shape.

### 4.2 What Application must NOT do

- Re-check something an aggregate method already checks (e.g., must not
  pre-validate "is this resident currently participating" before calling
  `recordControl` — that's `Surgery`'s job, and duplicating it would mean
  two places could disagree).
- Mutate `Control` directly, or otherwise reach past `Surgery`'s public
  methods into its internals. There is no `ControlRepository` and none
  should be introduced — every Control-shaped operation available to
  Application is a method on `Surgery`.
- Introduce a repository into a domain entity/aggregate (no domain class
  should ever import or receive a repository).
- Create a `*UseCase` class for every operation as a matter of course.
  Nothing about this domain's actual orchestration needs (see 4.3)
  requires a class-per-operation architecture — a small function that
  closes over its repository dependencies is sufficient wherever tried
  against the real operations below.

### 4.3 A concrete finding: one place Application genuinely must fill a domain gap

`Surgery.assignResident(residentId: string, actingPhysicianId: string)`
has no parameter carrying the Resident's own tenant. It cannot check "does
this residentId actually belong to my physicianId" — its signature simply
doesn't receive that information, by design (Surgery correctly has no
repository to go look it up itself). That means: **without an
Application-level check, `assignResident` would silently accept a
`residentId` string belonging to a different tenant's Resident**, because
nothing in the domain, anywhere, currently verifies Resident/Surgery
tenant agreement.

This is materially different from the ResearchStudy/Surgery case: there,
`ResearchStudy.addSurgery` _does_ receive `surgery.physicianId` as part of
its input and _does_ assert the match internally (line 126) — Application
only has to supply a truthful value, not perform the check itself. For
Resident/Surgery, no domain method receives both ids together, so
Application has to perform the tenant-match check itself, using the
domain's own `DomainError` type (because this is a business rule being
enforced, not an application-specific concern like "not found") — while
still delegating the actual `assignResident` mutation, and its
participation-immediately, removal-preservation invariants, to `Surgery`
itself.

This is not Application inventing a new business rule — the rule "a
resident must belong to the same tenant as the surgery they're assigned
to" is already implied by DOMAIN.md's tenancy model (§2: "Patient data
never crosses tenant boundaries" combined with §10's resident-tenant
ownership) and by the fact that _every other_ tenant-owned relationship in
this domain is tenant-checked somewhere. It's a gap in the aggregate's
_signature_, not in the business rule itself, and Application is the
correct place to close it because only Application has access to both
repositories at once.

---

## 5. Boundaries this document does not change

Nothing here modifies `packages/domain/src`, `docs/domain/DOMAIN.md`, or
any existing ADR. It is a record of reasoning already embedded in the
code and in ADR 0006/0007/0010, made explicit for Application Layer
design purposes.

---

## 6. Follow-up cleanup (recorded, not performed)

Carried over unchanged from the Tactical DDD Challenge, not expanded:

- `resident.ts`'s class doc comment references a `Patient.assignResident`
  method that no longer exists (superseded by ADR 0010). Needs a wording
  update, not a behavior change.
- `surgery.ts`'s `RecordControlInput = Omit<ControlAttributes, never>` is
  a no-op type alias (`Omit<X, never>` is identical to `X`). Harmless,
  but worth simplifying to `type RecordControlInput = ControlAttributes`
  next time that file is touched for an unrelated reason.

Neither blocks Application Layer implementation, and neither is touched
in this task.

---

## 7. Milestone 2 addendum — `Surgery.reconstitute` is hydration, not a boundary change

Milestone 2 (`packages/infrastructure`) added `Surgery.reconstitute(...)`
to `packages/domain/src/surgery/surgery.ts`. This section records why
that addition is consistent with everything above, rather than an
exception to it.

**What it is.** A second static factory on `Surgery`, alongside
`Surgery.create`, whose only purpose is to rebuild an aggregate that is
already known to be valid — because it was loaded from persisted state a
repository just read back — including its full `Control` history and its
complete `participatingResidentIds` roster.

**Why it is intentionally distinct from `Surgery.create`.**
`Surgery.create` answers "is this a valid _new_ Surgery" and therefore
runs creation-time validation (non-empty id/physicianId/patientId/
procedureTypeId, a real `performedAt`) and always starts with empty
`controls_`/`participatingResidentIds_` — there is no legitimate way for a
brand-new Surgery to already have history. `reconstitute` answers a
different question — "rebuild the Surgery this already-validated record
describes" — so it does not re-run those creation checks, and it accepts
the child state (`controls`, `participatingResidentIds`) that `create`
correctly refuses to accept. Reusing `create` for hydration would have
been the actual mistake: it has no parameter for pre-existing children,
so persisted Controls/residents could not have been restored through it
at all.

**Why this does not weaken Domain purity.** `reconstitute`'s parameter
shape is built entirely from types Domain already owns and exports
(`ControlAttributes[]`, `string[]`, the same primitives `SurgeryAttributes`
uses) — nothing from `@prisma/client`, nothing infrastructure-shaped,
nothing repository-shaped. `packages/domain` still has zero outbound
dependencies; only the _caller_ (`PrismaSurgeryRepository.findById`)
knows about Prisma, and it does the row→attributes mapping itself before
calling `reconstitute`.

**Why the aggregate boundary is unchanged.** `reconstitute` does not
introduce a new way to construct a `Control` from outside `Surgery`, does
not expose `controls_`/`participatingResidentIds_` for external mutation,
and does not add a second load/save path that bypasses `Surgery` — a
repository still loads and saves exactly one `Surgery` per operation, per
§1.3/§3 above. It is a second entry point into the _same_ consistency
boundary, not a second boundary.

**Why runtime invariants still hold after reconstruction.** Because
`reconstitute` populates the real private fields `Surgery`'s own methods
already read from (`controls_`, `participatingResidentIds_`), every
invariant that depends on them — the participation-preservation rule in
`removeResident`/`hasResidentParticipated`, the authorship check in
`recordControl` — operates identically on a reconstituted aggregate and
on one built through `assignResident`/`recordControl` calls. There is no
separate "reconstructed" code path inside those methods that could drift
from the "freshly built" one.

**What is deliberately out of scope for `reconstitute`.** It does not
re-validate the top-level Surgery fields (id/physicianId/patientId/
procedureTypeId/performedAt) the way `create` does — those are trusted as
already-valid because the schema enforces them as `NOT NULL` at the
database level (see `packages/infrastructure/prisma/schema.prisma`).
Each `Control` passed in is still built via `Control.create`, which does
re-run Control's own field-shape validation — this is harmless (the data
was already valid when first written) and acts as an incidental
corruption check, not a required part of the hydration contract.

### 7.1 Milestone 6 addendum — `ResearchStudy.reconstitute` applies the same criteria

`ResearchStudy.reconstitute(...)` (`packages/domain/src/research/research-study.ts`)
was added during Milestone 6's integration review, for the same reason
and checked against the same criteria as §7 above — recorded here rather
than re-derived, per the re-verification requested when M4–M7 were
reviewed against this document.

- **What it replaced**: `PrismaResearchStudyRepository`'s original
  hydration path rebuilt a study by calling `ResearchStudy.create()` and
  then replaying `addSurgery()` once per persisted row, followed by
  `moveToInProgress()`/`complete()` to walk the status back up to
  whatever it was persisted as. This is exactly the anti-pattern §7
  documents `Surgery.reconstitute` was introduced to avoid: re-running
  transition-guard business checks against data that was already valid
  when it was first written.
- **Same distinction as `create` vs. `reconstitute` for Surgery**:
  `ResearchStudy.create` answers "is this a valid _new_ study" (always
  starts `DRAFT`, empty `surgeryIds_`); `reconstitute` answers "rebuild
  the study this already-validated record describes" — it sets
  `status_` directly and populates `surgeryIds_` from the persisted list,
  without calling `addSurgery`/`moveToInProgress`/`complete` at all.
- **No persistence logic hidden in Domain**: `reconstitute`'s parameter
  shape is built entirely from primitives and `ResearchStudyStatus`
  (a type Domain already owns) — nothing Prisma-shaped, no repository
  concept, no row-mapping logic. `PrismaResearchStudyRepository`'s own
  `reconstitute()` helper function still does the row→params mapping
  itself, exactly as `PrismaSurgeryRepository` already does for
  `Surgery.reconstitute` — this was verified by reading both repository
  files directly, not assumed from the naming similarity.
- **Aggregate boundary unchanged**: `reconstitute` does not add a second
  load/save path, does not expose `surgeryIds_` for external mutation
  beyond what `addSurgery`/`removeSurgery` already allow, and the
  COMPLETED-immutability invariant is proven to hold identically on a
  reconstituted instance (`research-study.test.ts`'s own reconstitute
  test asserts `updateConclusion` still throws and `reopen` still
  succeeds on a reconstituted `COMPLETED` study).

## 8. Milestone 4–7 addendum — the Domain→wire-shape convention

`docs/architecture/m4-m7-conformance-review.md` §2.3 found two different
answers, across the milestones reviewed, to "who converts a Domain
entity into the JSON `packages/http` sends back":

- **Patient / ProcedureType / Surgery / Resident** (Milestones 1–5, the
  latter after its own §2.2 fix): the Application operation returns the
  raw Domain entity (`Patient`, `Surgery`, `Resident`, …) unchanged;
  `packages/http` owns a dedicated `serializePatient`/`serializeSurgery`/
  `toResidentDto` function per resource that reads the entity's public
  getters and produces a plain object.
- **Research Study** (Milestone 6): the Application operation
  (`getResearchStudy`/`listResearchStudies`) returns an already-flattened
  plain type (`ResearchStudySummary`) directly; `packages/http` passes it
  through untouched.

**Decision: keep both. No refactor was made to either.** This is not the
kind of inconsistency this project corrects by making everything match —
here is why, checked against the three questions this addendum was asked
to answer:

- **Is it a real duplication risk?** No. Each resource's Domain→wire
  mapping exists in exactly one place — inside its own vertical, not
  copied across two locations for the same resource the way §2.2's
  Resident-read bypass was. Nothing here can silently drift out of sync
  with itself. Compare this to §2.2, which was a genuine duplication (the
  same tenant-check logic existed in two places) and _was_ corrected.
- **Is it an architectural boundary that needs fixing before the
  frontend depends on it?** No — checked directly against
  `docs/architecture/milestone-8-design.md` §6, which was written
  assuming exactly this kind of per-resource variation exists: each
  `features/<slice>/dtos.ts`/`mappers.ts` pair is defined against
  whatever shape that resource's own `api` route actually returns, not
  against one assumed-uniform contract. The frontend design already
  absorbs this without any change.
- **Would unifying it be worth the risk?** No, on either direction.
  Rewriting Research Study to match the four-resource majority would
  mean reintroducing Domain-shape knowledge into `packages/http` for a
  resource where it was deliberately kept out — a step backward against
  this document's own stated goal (§4.1/§4.2: HTTP is translation-only).
  Rewriting the four majority resources to match Research Study would
  touch `core-loop.ts`/`resident.ts` and their passing test suites for a
  purely cosmetic gain, with no defect motivating it — exactly the kind
  of change the product owner asked not to make "simplemente para
  conseguir uniformidad."

**What is decided, for new work going forward**: new Application read
operations should return an already-flattened, wire-shaped type (the
Research Study convention), not a raw Domain entity — this keeps
`packages/http` free of any Domain-getter knowledge for the resource
going forward, which is the stricter reading of "HTTP is
translation-only" this document already commits to. **This is
prospective only.** It does not obligate a rewrite of
Patient/ProcedureType/Surgery/Resident's existing, working, tested
serialization — those stay exactly as they are unless a real defect
(not an aesthetic one) is found in them.

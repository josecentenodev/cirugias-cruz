# 0017 — Resident authentication: physician-issued temporary password

## Status

Established (current iteration). Extends [0012](0012-physician-identified-by-email.md)
(the same email+password authentication mechanism, applied to a second
kind of principal) and [0007](0007-residents-optional-and-immutable-once-participated.md)/
[0010](0010-resident-participation-scoped-to-surgery.md) (unchanged —
this decision is only about how a Resident authenticates, not about
participation/assignment rules, which stay exactly as those ADRs
describe). Chosen over the alternative of Residents never having their
own login (Control authorship attributed by the Physician on their
behalf, the status quo today).

## Decision

1. **A Resident becomes able to log in.** Creating a Resident (already a
   Physician-only operation) now also creates credentials for them —
   this is new; today creating a Resident creates no credential at all.
2. **The Physician does not choose the Resident's password.** The system
   generates a random temporary password at creation time.
3. **Changing that password is mandatory on first login.** A Resident
   who has never changed their random temporary password cannot proceed
   past login without changing it first.
4. **The Physician can view the temporary password in the `web` UI, as
   many times as they want, for as long as it hasn't been changed.**
   This is the delivery mechanism — the Physician reads it off the
   screen and passes it to the Resident out of band (in person, a
   phone call, however they choose); the product does not email or
   otherwise transmit it itself. Once the Resident changes it, the
   Physician can no longer see it (there's nothing valid left to show).
5. **The Resident continues to be identified by `email`**, same as
   Physician (0012) — no new identifier concept.
6. **`Session` gains an explicit `userType: "physician" | "resident"`
   field, plus a nullable `residentId`, rather than a parallel session
   concept.** `physicianId` keeps its current meaning (the tenant) and
   is populated identically for both kinds of session — a Resident's
   session carries the `physicianId` of the physician they belong to,
   exactly as needed for every existing tenant-scoping check to keep
   working unchanged. `residentId` is present only when
   `userType === "resident"`, and is what a route/operation checks for
   "is this Resident session allowed here" and "is this Control theirs."
   See "Technical representation" below for the reasoning and the
   alternatives this was chosen over.
7. **A logged-in Resident's access is scoped to the Surgeries they
   participate in, nothing else in the tenant:**
   - **Read**: the Resident sees a panel of the Surgeries they
     participate in (not the Physician's full Surgery list), and, once
     inside one of those Surgeries, **full read of every Control on
     it** — not only their own. Participation is what unlocks this
     (0010, unaffected: participation is still Surgery-scoped, assigned
     directly, unrelated to Patient).
   - **Create**: a Control on a Surgery they participate in (already
     true today, just previously always exercised through the
     Physician's own session — see 0004).
   - **Edit** — not delete — **a Control they themselves authored.**
     This amends [0004](0004-controls-not-followup-entity.md)'s rule
     that only the Physician may modify a Control (0003's equivalent
     rule is about modifying/deleting the _Surgery_ itself, which is
     unaffected — that stays Physician-only): the Physician retains the
     unrestricted ability to modify or delete _any_ Control in their
     tenant; a Resident's modification right is strictly narrower —
     their own authored Controls only, edit only, never delete, and
     never another Resident's.
   - Everything else in the tenant (other Surgeries, Patients,
     ProcedureTypes, ResearchStudies, other Residents) is out of scope
     for a Resident session — not merely unmentioned, but explicitly
     denied by omission: a Resident session must not default to
     Physician-equivalent access to anything this decision doesn't name.
8. **Password reset ("blanqueo"): the Physician can regenerate a new
   random temporary password for a Resident at any time** (e.g. the
   Resident forgot theirs) — this replaces decision item 4's viewable
   state: the freshly generated password becomes visible again in the
   `web` UI, and item 3 applies again (mandatory change on next login).
   This is the same mechanism as initial issuance (items 2–4), just
   re-triggered on demand, not a separate feature.
9. **Deactivating a Resident blocks login and forces the immediate
   closure of any session they currently hold.** Not just "no new
   logins" — an already-open session is invalidated too, so
   deactivation takes effect immediately, not "next time they'd have to
   log back in anyway." The rejection on a subsequent login attempt can
   be a distinct, specific message ("this account has been
   deactivated"), not folded into the generic "invalid email or
   password" — same reasoning `login` already applies to the unconfirmed-
   email case (0015): the caller has already proven they hold the right
   password, so there's no information-leak concern left to protect by
   staying vague.
10. **A Resident session can read the Patient and ProcedureType
    identifying information attached to a Surgery they're reading.**
    Treated as part of "full read" of a Surgery they participate in
    (item 7) — a Surgery panel without knowing which patient/procedure
    it's for wouldn't be usable. Named as its own item here (rather than
    left as an unstated assumption) precisely because Patient data is
    otherwise treated carefully in this project.

## Rationale

The current model (Physician-only sessions, Resident is pure roster/
attribution data with no login) makes every "resident-authored" Control
actually authored, technically, by the Physician typing on the
resident's behalf. Giving Residents their own credentials lets a
Resident authenticate and act as themselves, which is what "Option B"
from the prior analysis exists to enable.

## Scope of this decision

- **Temporary password generation**: server-generated, random — same
  posture as any other credential this product issues (session ids,
  confirmation tokens): opaque, not something a human picks.
- **The temporary password must be stored in a form the Physician can
  retrieve, not just a one-way hash** — a direct consequence of decision
  item 4 (viewable repeatedly until changed). This is a deliberate
  departure from how `PhysicianCredential` stores passwords (bcrypt hash
  only, never retrievable) and is worth naming explicitly: the temporary
  password is sensitive data at rest for as long as it remains
  unchanged. Once the Resident changes it, the _new_ password follows
  the normal hash-only posture — nothing about that changes. The exact
  storage mechanism (a separate reversible field vs. keeping the
  plaintext temp value until first change vs. something else) is an
  Infrastructure implementation detail, not decided here, but it must
  satisfy "Physician can read it back" — a plain hash cannot.
- **Control edit scope**: a Resident's edit right is strictly per-Control
  (theirs, authored by them) and per-permission (edit, not delete) — it
  does not extend to any other Resident's Controls, nor to deleting even
  their own.

## Technical representation: `userType` on the existing `Session`

`Session`/`SessionRepository`/`requireAuth`
(`packages/http/src/shared/require-auth.ts`) exist today as a single
concept, and `request.physicianId` — populated only by `requireAuth` —
is read in **29 call sites across 4 route files**, always to scope a
query to a tenant, never to mean "the literal caller." A Resident's
session needs to carry that same tenant `physicianId` (they belong to
exactly one physician) _plus_ which specific principal is authenticated
and what kind it is. Three shapes were considered:

- **Chosen: extend `Session` in place** with
  `userType: "physician" | "resident"` and a nullable `residentId`. One
  table (`sessions` plus one nullable column), one `SessionRepository`,
  one `requireAuth`. `physicianId`'s meaning is unchanged, so all 29
  existing tenant-scoping call sites need zero changes; a new guard is
  only needed on the smaller set of routes where Resident access
  actually differs (item 7). `userType` is an explicit field rather
  than inferred from `residentId`'s nullability, to avoid the class of
  bug where a missed/incorrect null check silently treats a Resident as
  a Physician. This mirrors the reasoning already used for
  `EmailConfirmationTokenRepository` in 0015 — "same kind of thing for
  a different purpose, not a new pattern": an authenticated Resident
  session _is_ a session, not a different concept.
- **Rejected: a discriminated union of two `Session` variants.** More
  type-safe (exhaustive narrowing at compile time), but requires
  touching all 29 existing call sites to narrow the union, and gives
  `SessionRepository.create()` two shapes instead of one. More
  discipline than this problem currently needs.
- **Rejected: a fully separate `ResidentSession`/
  `ResidentSessionRepository`/`requireResidentAuth`.** Keeps the two
  concepts fully apart, but duplicates near-identical session machinery
  (table, repository, cookie handling) for something that is not
  actually a different kind of thing the way a confirmation token is —
  it's the same "authenticated principal scoped to one tenant" concept,
  just a second kind of principal.

## Not implemented by this ADR

Recording the decision only. Implementation touches Domain (a Resident
now has associated credentials — same layering question 0012 already
resolved for Physician: credential state lives in
Application/Infrastructure, not on the Domain `Resident` entity),
Application (`Session` gains `userType`/`residentId`; a
`ResidentCredentialRepository`/temp-password issuance; the login/
password-change/reset operations), Infrastructure (Prisma model changes
for `sessions` and the new resident-credential table, password hashing
— reusing `BcryptPasswordHasher`), HTTP (`requireAuth` populates the new
fields; new route-level guards for Resident-scoped access; forced
session invalidation on deactivation), and `web` (temp-password display,
forced password-change flow, deactivate/reset actions in the Resident
UI).

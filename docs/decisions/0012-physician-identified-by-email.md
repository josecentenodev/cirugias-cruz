# 0012 — Physician is identified/authenticated via `email`; Physician creation is now in-scope

## Status

Established (current iteration). Extends [0009](0009-physician-is-the-tenant-shared-person-shape.md)
— does not amend or supersede it.

## Decision

For authentication purposes, a `Physician` will be identified via the
`email` field already present on `Physician` (part of the shared Person
shape established in ADR 0009 — `firstName`/`lastName`/`phone`/`email`/
`dateOfBirth`). No new Domain field is introduced by this decision.

Consequently, "a real Physician can be created" is no longer an
indefinitely-deferred gap. Some minimal Physician-creation path must exist
before a Physician identity can mean anything outside test fixtures.

## Rationale

The product needs a physician's identity to be resolvable from something
they can present at login (their email) before any authentication
mechanism can be built on top of it. `email` already exists on `Physician`
as a required field — reusing it avoids inventing a second identifier.

## Scope of this decision

This decision settles only:

1. **Which field identifies a Physician for authentication** — `email`,
   not a new field.
2. **That Physician creation is now a required capability**, not a
   permanently-deferred one — some operation must be able to create a
   real `Physician` row before Milestone 3 can have a real physician
   identity to authenticate as.

## Not decided here — remaining open decisions

- **The authentication mechanism itself** (password, magic link,
  external OAuth/IdP, session vs. token) remains undecided. This ADR does
  not choose one, and none should be assumed. This is the same open item
  already tracked in `docs/architecture/ROADMAP.md` under "HTTP framework
  and authentication approach."
- **Whether `email` must be unique across all Physicians.** For `email`
  to function as an identifier at all, some uniqueness guarantee is
  implied, but this ADR does not decide the mechanism (schema-level
  unique constraint vs. application-level check), case-sensitivity, or
  whether a Physician's email can change after creation. These are
  implementation questions for whoever builds the Physician-creation
  path, not settled here.
- **Whether authentication concepts (password hashes, sessions, tokens,
  external identity ids) belong on `Physician` itself or on a separate
  concept.** Nothing here decides this. `Physician` remains the Domain
  concept representing the tenant/workspace owner; authentication
  infrastructure — whatever it turns out to be — is a separate concern
  layered on top, not assumed to live inside `packages/domain`.
- **Physician account activation/deactivation by the Platform Admin**
  (already described in DOMAIN.md §3) is unaffected by this decision and
  is not re-opened here.

## Not implemented by this ADR

No code changes accompany this decision. It exists to record the product
decision and unblock Milestone 3 planning — the actual `registerPhysician`
Application operation, `PhysicianRepository` port, and Infrastructure
implementation remain to be built, following the same pattern already
proven for Patient/ProcedureType/Surgery in Milestones 1–2.

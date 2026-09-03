# 0015 — Physician self-registration requires email confirmation before login (via Resend)

## Status

Established (current iteration). Extends [0012](0012-physician-identified-by-email.md)
— does not amend or supersede it. Motivated by needing a real way for
physicians to obtain their own login, now that `packages/web` is
publicly deployed (Milestone 8) with no self-registration screen.

## Decision

1. **Registration still creates a `Physician` and a `PhysicianCredential`
   immediately** (`registerPhysician`, unchanged in that respect) — but
   the credential starts **unconfirmed**.
2. **`login` rejects an unconfirmed credential** with the same
   `DomainError` shape it already uses for a wrong password — a
   physician cannot use the product until they've confirmed the email
   address they registered.
3. Confirmation happens via a **single-use, expiring token** emailed to
   the address they registered with. Visiting the confirmation link
   marks the credential confirmed and invalidates the token.
4. **The confirmation link points at `web`, never at `api` directly** —
   `api` has no public domain by design (ADR 0014's BFF pattern); `web`
   resolves the token server-to-server against `api`, the same way every
   other authenticated request already works.
5. **Email is sent via [Resend](https://resend.com)** — a new
   `EmailSender` Application port, with a `ResendEmailSender`
   Infrastructure adapter. Chosen over Postmark/SES for the simplest
   setup at this stage (see `docs/architecture/ROADMAP.md`'s Milestone 8
   closure conversation for the comparison); nothing about the port
   itself is Resend-specific, so swapping providers later is an
   Infrastructure-only change.

## Rationale

`email` is already the tenant identifier (ADR 0012) — a physician's
entire private workspace hangs off it. Letting someone log in
immediately after typing an email they don't control (typo, someone
else's inbox) would let them either lock out the real owner later or use
the product under an address that silently never receives anything sent
to it. Confirming ownership before granting access is the same reasoning
most consumer products with per-account private data use, and costs one
extra Application operation, not a new Domain concept.

## Scope of this decision

- **Token lifetime: 24 hours**, matching the existing session-cookie
  precedent already established for this product's other short-lived,
  server-issued tokens (`SESSION_TTL_MS` in
  `packages/infrastructure/src/physician/prisma-session-repository.ts`).
- **One-time use**: the token is deleted once redeemed; visiting an
  already-used or expired link fails with a clear, non-destructive error
  (no account lockout, no data loss — the physician can be sent a new
  confirmation token).
- **Where "confirmed" lives**: on `PhysicianCredential`
  (`confirmedAt: Date | null`), not on the Domain `Physician` entity —
  this follows the same reasoning ADR 0012 already recorded for password
  hashes and sessions: authentication state is an Application/
  Infrastructure concern layered on top of `Physician`, never inside
  `packages/domain`.
- **Where the confirmation token lives**: a new, Session-shaped
  Repository (`EmailConfirmationTokenRepository` / `email_confirmation_tokens`
  table) — deliberately mirroring `SessionRepository`'s own
  `{ id, physicianId, expiresAt }` shape (an opaque bearer token with a
  server-controlled expiry), since it is the same kind of thing for a
  different purpose, not a new pattern.

## Not decided here — remaining open items

- **Resend-confirmation-email UX** (a button on some "check your email"
  screen, rate-limited) — not built by this decision; a physician whose
  first email doesn't arrive currently has no self-service way to
  request a second one. Tracked as a fast-follow, not blocking.
- **Deliverability specifics** (custom sending domain vs. Resend's
  shared sandbox domain, SPF/DKIM records) — an operational setup step
  for whoever holds the Resend account, not an architectural decision.
- **Whether Platform Admin needs visibility into unconfirmed accounts**
  — Platform Admin is still Post-MVP (DOMAIN.md §3); not reopened here.

## Not implemented by this ADR

Recording the decision only; implementation (Application operations,
`EmailSender`/`EmailConfirmationTokenRepository` ports, Prisma model,
`ResendEmailSender`, HTTP routes, and the `web` UI) follows immediately
in the same change, using the same layering already proven for every
prior vertical slice.

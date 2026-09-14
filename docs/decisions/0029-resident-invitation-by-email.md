# 0029 — Resident onboarding moves from a visible temporary password to an emailed invitation with acceptance

## Status

Established (current iteration). **Amends [0017](0017-resident-authentication-physician-issued-temporary-password.md)**
— replaces items 2, 4, and 8 (temporary-password generation, the
Physician viewing it in `web`, and the "blanqueo" reset re-using that
same mechanism) with an emailed invitation-and-acceptance flow. Does
**not** touch 0017 items 1, 3, 5, 6, 7, 9, 10: a Resident still becomes
able to log in as its own principal (item 1); changing a password is
still mandatory on a Resident's very first successful authentication in
the sense that they must set one before they have any usable credential
at all (item 3, restated below); the Resident is still identified by
`email` (item 5); `Session.userType`/`residentId` is unchanged (item 6);
the Resident's scoped read/write access (item 7) is unchanged; forced
session invalidation on deactivation (item 9) and reading Patient/
ProcedureType identifiers on a participated Surgery (item 10) are
unchanged. Extends [0015](0015-physician-self-registration-email-confirmation.md)'s
`EmailSender` port and mirrors its `EmailConfirmationToken` pattern for a
second purpose — "same kind of thing, not a new pattern," per 0015's own
precedent for `Session`.

## Decision

1. **Creating a Resident no longer generates a random temporary password
   at all.** `registerResident` creates the `Resident` (Domain, unchanged)
   and a `ResidentCredential` row with **no usable password** (no
   `passwordHash` yet — see "Technical representation" below) —
   analogous to how `registerPhysician` already creates a
   `PhysicianCredential` with `confirmedAt: null` before anything is
   confirmed.
2. **An invitation email is sent immediately after**, mirroring
   `sendConfirmationEmail`'s placement after `registerPhysician` (0015):
   a new `sendResidentInvitation` Application operation issues a
   single-use, expiring **`ResidentInvitationToken`** and emails a link
   to the Resident's registered address via the existing `EmailSender`
   port — no new provider, no new Infrastructure adapter beyond a new
   repository for the token.
3. **The invitation link points at `web`, never at `api` directly** —
   same reasoning as 0015 item 4 (`api` has no public domain, BFF
   pattern). `web` resolves the token server-to-server against `api`.
4. **Opening the link takes the Resident to an "accept invitation"
   screen where they choose their own password** (subject to the same
   password-strength rule already applied to a Physician's password at
   registration, unchanged) — not a Physician-chosen or system-generated
   value at any point. Submitting it sets `passwordHash` on
   `ResidentCredential`, marks the invitation token used, and the
   Resident can now log in.
5. **The Physician no longer sees any password (temporary or otherwise)
   in `web`.** What the Physician sees instead, per Resident, is
   **invitation status**: `pending` (link sent, not yet accepted, with
   the send timestamp) or `accepted` (with the acceptance timestamp).
   This is strictly less sensitive information than 0017 item 4 exposed,
   consistent with the rationale below.
6. **"Blanqueo" (item 8) becomes "resend invitation," not "regenerate and
   re-display a password."** If a Resident needs a new credential (lost
   access, wants to change how they log in), the Physician triggers
   `resendResidentInvitation`: this clears `passwordHash` back to unset,
   invalidates any outstanding invitation token, issues a fresh one, and
   re-sends the email. Until accepted again, the Resident **cannot log
   in** — there is no fallback credential left valid, which is a
   deliberate tightening: 0017's re-issued temporary password remained a
   valid credential (readable by the Physician) until changed, whereas
   here there is no credential at all in the gap between resend and
   acceptance.
7. **A Resident with a pending (never-yet-accepted) invitation cannot log
   in at all** — there is no password to check yet. This is a new,
   distinct rejection case from 0017 item 9's "deactivated" case, and
   should get its own clear, non-generic message for the same
   information-leak-is-moot reasoning 0017 item 9 and 0028 item 4 both
   already use (the caller isn't presenting a password to fail against
   in the first place, so there's nothing to stay vague about — the
   Resident genuinely has no way in yet, and needs to know that, not
   guess whether they mistyped something).
8. **Deactivating a Resident (0017 item 9, unaffected) also invalidates
   any outstanding, unaccepted invitation token** — a deactivated
   Resident should not be able to accept a stale invitation and gain
   access. Re-activating (if that capability exists or is added later) is
   out of scope here; not decided by this ADR.

## Rationale

0017's reasoning for a **visible, Physician-relayed** temporary password
was explicit: "the product does not email or otherwise transmit it
itself" — at the time, no verified sending domain existed, so email
delivery to a Resident's real address wasn't a credible channel at all.
That constraint no longer holds (ADR 0028: `seguimientocirugias.com` is
verified in Resend). Once email is a trustworthy channel, an
invitation-and-accept flow is strictly better on the dimension 0017 itself
flagged as the uncomfortable part of its own design: item 4 required
storing a password **retrievably** (a deliberate, named departure from
the hash-only posture used everywhere else), and the Physician reading
someone else's login credential off a screen is inherently a password the
Physician has seen, even if only transiently. An invitation the Resident
alone completes means no one but the Resident ever holds their own
password in any form — the same posture `PhysicianCredential` already
has. This is a genuine security-posture improvement, not a cosmetic
change, and is named as such rather than folded in quietly.

## Scope of this decision

- **Invitation token lifetime**: 7 days — longer than
  `EmailConfirmationToken`'s 24 hours (0015), because a Resident
  accepting access to a system they didn't initiate the registration for
  is reasonably expected to take longer to act than someone who just
  submitted their own signup form. An expired, unaccepted invitation is
  resolved the same way as 0015's expired confirmation token: a clear,
  non-destructive error, with "resend invitation" (item 6) as the
  self-service path — no account lockout, no data loss.
- **Where the invitation token lives**: a new
  `ResidentInvitationTokenRepository` / `resident_invitation_tokens`
  table, shaped like `EmailConfirmationToken` (`{ id, residentId,
expiresAt }`) — deliberately the same shape for the same reason 0015
  gave for `EmailConfirmationToken` itself: an opaque, server-issued,
  expiring bearer token is the same kind of thing regardless of which
  principal or purpose it's for.
- **`ResidentCredential.temporaryPassword` and `mustChangePassword`
  become unused by new Residents** created under this ADR — no
  temporary password is ever generated, so there is nothing to store in
  `temporaryPassword` and no "must change on first login" state distinct
  from "has no password yet, cannot log in." Whether to migrate/backfill
  or drop these columns for **pre-existing** Residents created under the
  old 0017 mechanism, if any exist, is a migration detail for
  implementation, not decided here — but the column removal itself
  (once no code path writes to it) is in scope for the implementing
  change, not deferred.
- **Password strength/validation for a Resident setting their own
  password**: reuses whatever rule already applies to Physician
  registration passwords, unchanged — no new rule invented here.

## Technical representation: no usable credential until accepted

`ResidentCredential.passwordHash` was previously always set (to a hash of
the system-generated temporary password) at creation time. Under this
ADR, it starts genuinely absent (nullable) until acceptance. Three shapes
were considered for representing "invited but not yet accepted":

- **Chosen: `passwordHash` nullable on `ResidentCredential`, no separate
  status column.** "Has this Resident accepted?" is exactly "is
  `passwordHash` set?" — no state can get out of sync with itself, unlike
  a separate boolean that could in principle disagree with whether a hash
  actually exists. `login` already needs to load the credential to check
  a password; a null `passwordHash` is simply the not-yet-accepted case,
  checked once. Mirrors how `PhysicianCredential.confirmedAt: Date | null`
  (0015) already uses nullability itself as the state, rather than a
  separate flag plus a value.
- **Rejected: a separate `status: "invited" | "accepted"` enum column.**
  More explicit at a glance, but introduces exactly the redundant-state
  risk nullable `passwordHash` avoids, for no behavior nullable can't
  already express.
- **Rejected: keep issuing a temporary password internally (never
  shown), and have "acceptance" just mean "changed it."** This would
  keep 0017's `mustChangePassword` machinery reusable unmodified, but
  reintroduces the exact thing this ADR removes — a system-generated
  password that exists, in hashed form, before the Resident has ever
  chosen anything — for no benefit once the Physician never displays it
  anyway.

## Not decided here

- Whether a Physician can **cancel** a pending invitation outright
  (distinct from "resend," which re-issues rather than revokes) — not
  requested, not built.
- Any UI for the Physician to see a history of past
  invitations/acceptances beyond current status (item 5) — not requested.
- Whether this pattern extends to Physician-to-Physician invitations of
  any kind — no such concept exists in this product (0009: Physician IS
  the Tenant, self-registers) and this ADR does not introduce one.

## Not implemented by this ADR

Recording the decision only. Implementation touches:

- **Application**: `registerResident` stops generating/hashing a
  temporary password; new `sendResidentInvitation`,
  `acceptResidentInvitation`, `resendResidentInvitation` operations; a
  new `ResidentInvitationTokenRepository` port (mirrors
  `EmailConfirmationTokenRepository`); `login` (Resident branch) gains
  the "no credential yet" rejection case (item 7); deactivation
  (existing operation) additionally invalidates outstanding invitation
  tokens (item 8).
- **Infrastructure**: new `resident_invitation_tokens` Prisma model +
  migration; `passwordHash` becomes nullable on `resident_credentials`;
  `PrismaResidentInvitationTokenRepository`; `temporaryPassword`/
  `mustChangePassword` column removal (or a migration decision for
  pre-existing rows, per "Scope" above).
- **HTTP**: a route for accepting an invitation (resolves the token,
  sets the password) and a route for resending one; the existing
  Resident-detail route(s) stop returning a viewable password and start
  returning invitation status.
- **`web`**: replace the "view temporary password" UI with invitation
  status + a "resend invitation" action; a new `/accept-invitation` page
  (mirroring `/confirm-email`'s shape: `web` resolves the token
  server-to-server against `api`) where a Resident sets their password.

None of this is built by this ADR — it records the decision only.

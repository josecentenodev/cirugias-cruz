# 0016 — Physician email confirmation is paused for MVP; self-registration stays

## Status

Established (current iteration). **Amends [0015](0015-physician-self-registration-email-confirmation.md)**
— pauses part of it, does not reverse the parts it doesn't mention. Does
not touch [0012](0012-physician-identified-by-email.md) (`email` remains
the sole Physician identifier).

## Decision

1. **Physician self-registration stays, and stays necessary.** Multiple
   physicians (tenants) must be able to create their own account without
   manual provisioning — this was always the point of 0015 and is
   unchanged here.
2. **The email-confirmation _gate_ is paused for MVP.** `login` no
   longer requires `PhysicianCredential.confirmedAt` to be set — a
   physician can register and log in immediately, with no confirmation
   step in between.
3. **Deferred to Post-MVP**, not abandoned: verifying that the physician
   actually controls the email address they registered with. Revisiting
   this (and the Resend-based delivery it depends on) is planned
   Post-MVP work, not a closed question.
4. `email` continues to be the sole Physician identifier (0012,
   unaffected) — this decision only pauses _verifying_ it, not anything
   about what it identifies.

## Rationale

0015 was motivated by a real risk (someone using the product under an
address they don't control) but implementing and operating email
delivery correctly (a verified Resend sending domain, deliverability,
resend-confirmation UX) is Post-MVP effort the product doesn't need to
carry before validating the MVP itself. Pausing the gate — rather than
ripping the feature out — keeps the option to re-enable it later without
redesigning the identity model.

## Scope of this decision

- This pauses **decision items 2 and 5** of 0015 specifically (`login`
  rejecting an unconfirmed credential; sending the confirmation email).
  Items 1, 3, and 4 of 0015 (registration creates an immediately-usable
  credential; the token/link mechanics if and when confirmation
  resumes; the link pointing at `web`, never `api`) are **not**
  reversed — they're simply not being enforced or exercised for now.

## Resolved

- **The confirmation machinery built for 0015 stays in the codebase,
  dormant, rather than being stripped out.**
  `EmailConfirmationTokenRepository`, `ResendEmailSender`,
  `send-confirmation-email`/`confirm-physician-email`, the
  `/confirm-email` page, and the Prisma model/migration all remain as
  built. Only the _enforcement_ in `login` is removed. Re-enabling
  confirmation Post-MVP is then a small, reversible change (restoring
  the check in `login`, resuming the send on registration), not a
  rebuild.
- **`registerPhysician` keeps creating `PhysicianCredential` with
  `confirmedAt: null`.** The field stays on the credential, just
  unenforced — consistent with leaving the rest of the 0015 machinery in
  place rather than half-removing it.
- Consequence: registration **can still send the confirmation email**
  (the send itself isn't being turned off, only the login gate is) —
  whether it actually does anything useful depends on `RESEND_API_KEY`
  being configured; if it isn't, the existing resilience behavior from
  0015 already handles that (registration succeeds regardless, the
  send failure is only logged). No behavior change needed there.

## Not implemented by this ADR

Recording the decision only. Implementing it means removing the
`confirmedAt` check from `login` (Application) — and nothing else; the
rest of the 0015 machinery is left exactly as built, per the "Resolved"
section above.

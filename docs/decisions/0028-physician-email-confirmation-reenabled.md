# 0028 — Physician email confirmation gate is re-enabled; sending domain is verified

## Status

Established (current iteration). **Amends [0016](0016-physician-email-confirmation-paused-for-mvp.md)**
— reverses its pause of [0015](0015-physician-self-registration-email-confirmation.md)'s
decision items 2 and 5, restoring both. Does not touch
[0012](0012-physician-identified-by-email.md) (`email` remains the sole
Physician identifier) or 0015's items 1/3/4 (registration behavior,
token/link mechanics, link pointing at `web`), which were never paused
and are unaffected here.

## Decision

1. **The precondition 0016 named for lifting the pause is now met**: a
   real sending domain, `seguimientocirugias.com`, has been purchased and
   its DNS records (SPF/DKIM, added in Cloudflare) verified in Resend.
   Resend's shared sandbox domain (`onboarding@resend.dev`) — which only
   delivers to the Resend account owner's own address — is no longer the
   sender; `RESEND_FROM_EMAIL` moves to an address on the verified domain
   (see `docs/architecture/deployment-railway.md`).
2. **`login` once again rejects an unconfirmed `PhysicianCredential`**
   (0015 item 2, restored) — a physician cannot use the product until
   they've clicked the confirmation link sent to the address they
   registered with. Same `DomainError` shape already used for a wrong
   password, per 0015's original reasoning.
3. **Registration continues to send the confirmation email** (0015 item 5) — this was never actually disabled by 0016, only unenforced at
   login; nothing changes here except that delivery now reliably reaches
   real inboxes instead of only the account owner's own address.
4. **0015's previously-open "resend confirmation email" item is closed
   here**: a physician who hasn't confirmed and tries to log in sees a
   distinct, specific message (mirroring the pattern ADR 0017 item 9
   already uses for a deactivated Resident — the caller already proved
   they hold the right password, so there's no information-leak concern
   left to protect by staying vague) with a **"resend confirmation
   email" action**, rate-limited the same way `POST /sessions` already is
   (Milestone 7's forwarded-IP rate limiting — reused, not a new
   mechanism). This issues a fresh `EmailConfirmationToken` and invokes
   `sendConfirmationEmail` again; the old token, if any, is simply
   superseded (already-expired/used tokens fail harmlessly per 0015).

## Rationale

0016 paused the gate specifically because _operating real email delivery
correctly_ (a verified sending domain, SPF/DKIM, a resend path) was
Post-MVP effort at the time. That precondition is now satisfied: the
domain is bought, DNS is configured in both Cloudflare (records) and
Resend (verification), and `RESEND_API_KEY` is set on the `api` Railway
service. Nothing about the identity model changes — this restores
enforcement of a check that was already fully built and only dormant, per
0016's own explicit intent ("a small, reversible change ... not a
rebuild").

## Scope of this decision

- **Implementation**: remove the pause — restore the `confirmedAt` check
  in `login` (Application). Add a `resendConfirmationEmail` Application
  operation (thin wrapper: look up the credential by email, reject if
  already confirmed or not found — same non-leaking shape as `login`
  itself — otherwise issue a new token and call `sendConfirmationEmail`),
  a rate-limited HTTP route, and a "resend" affordance on `web`'s
  login/"check your email" screens. No Domain change: confirmation state
  was already modeled entirely in Application/Infrastructure (0015).
- **`RESEND_FROM_EMAIL`**: set to an address on `seguimientocirugias.com`
  (e.g. `Seguimiento de Cirugías <no-reply@seguimientocirugias.com>`) —
  see `deployment-railway.md` for the exact value and the Railway
  variable change.
- **`WEB_BASE_URL`**: must be set to `web`'s real public origin. Discovered
  while wiring this variable (outside this ADR's own scope): `web` is
  already served on `https://seguimientocirugias.com` rather than the
  Railway-generated URL — a product/ops decision made independently of
  this ADR's email-sending-domain purchase, but using the same domain.
  `ROADMAP.md`'s "Public domain" section is updated to reflect this.

## Not decided here

- Confirmation-token lifetime stays 24 hours (0015, unchanged) — not
  revisited by this ADR.

## Not implemented by this ADR

Recording the decision only. Implementation is: restoring the
`confirmedAt` check in `login`; adding `resendConfirmationEmail` +
its route + `web` affordance; setting `RESEND_FROM_EMAIL` (and verifying
`RESEND_API_KEY`/`WEB_BASE_URL`) on the live `api` Railway service.

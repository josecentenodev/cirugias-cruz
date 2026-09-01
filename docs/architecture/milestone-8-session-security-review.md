# Milestone 8 — Session Design Security Review

> Requested explicitly, before any Milestone 8 implementation is
> authorized: a dedicated review of `milestone-8-design.md` §3's session
> design — `web` relaying `api`'s own session id inside a `web`-owned
> cookie (`web_session`) — given this product will hold clinical data.
> This is not a general security audit of Milestone 8 (that's
> `milestone-8-design.md` §11); it is narrowly scoped to whether the
> relay mechanism itself is sound before it becomes code. No code exists
> yet; nothing here was verified by running anything, only by reading the
> design and the real, already-implemented `api` session mechanism
> (`packages/application/src/physician/session-repository.ts`,
> `packages/infrastructure/src/physician/prisma-session-repository.ts`,
> `packages/http/src/shared/session-cookie.ts`,
> `packages/application/src/physician/login.ts`) it relays.

---

## 1. What the design actually does, restated precisely

`api`'s own session (`Session { id, physicianId, expiresAt }`) already
exists and is unchanged by Milestone 8: `id` is a `randomUUID()` (122
bits of cryptographically random entropy — not sequential, not
derivable from the physician's identity), stored server-side in
Postgres, with a fixed 24h TTL and no rotation/idle-timeout concept
(`PrismaSessionRepository`'s own comment: "no requirement yet for a
different lifetime").

The design (`milestone-8-design.md` §3) has `web`'s server:

1. Call `api`'s `POST /sessions` with the physician's credentials.
2. Read the `session_id` value out of `api`'s `Set-Cookie` response
   header — server-side, never forwarded to the browser as-is.
3. Set its **own** cookie, `web_session`, on the browser — same value,
   same `httpOnly`/`sameSite: "lax"`/`secure`-in-production flags and
   expiry `api`'s cookie already uses, on `web`'s own origin.
4. On every subsequent request, read `web_session` server-side and
   forward it as `api`'s `session_id` cookie on the server-to-server
   call.

In other words: **`web_session`'s value is `api`'s session id,
verbatim** — a relay, not a second, independently-meaningful token.

## 2. Threat model actually applicable here

Scoped to what this specific mechanism can affect — not a general web
app security checklist:

- **In scope**: what happens if `web_session` (the value the browser
  holds) is exposed to someone other than the physician it belongs to;
  whether the relay step itself (as opposed to a hypothetical direct
  `api` cookie) introduces a new failure mode; whether logout/expiry
  behave correctly under the relay.
- **Out of scope, explicitly**: compromise of `web`'s own server
  (hosting/infra security, not a session-design question — `web` is a
  first-party trusted component in this architecture by construction,
  the same way `api` already is); `api`'s own session TTL/rotation
  policy (an M3 decision this review does not reopen — see §5); network
  transport encryption between `web` and `api` (Railway private-network
  topology, a hosting question, not addressed here); anything about
  password storage/hashing (unchanged, `api`'s own concern, already
  reviewed at Milestone 3).

## 3. Findings

### 3.1 — `web_session` is a bearer-equivalent credential, identical in blast radius to exposing `api`'s own cookie (CONFIRMED, not a defect — must be stated explicitly)

Anyone who obtains a valid `web_session` value can act as that physician
through `web` for as long as the session is valid — full read/write
access to that physician's Patients, Surgeries, Controls, Residents, and
Research Studies. This is **not a new risk the relay introduces** — it
is exactly the same blast radius `api`'s own `session_id` cookie already
carries today (Milestone 3), and exactly what any cookie-session web
application accepts by design. The relay doesn't make this worse; it
also doesn't make it better (see 3.2). What matters is that this fact is
recorded explicitly, not silently assumed, given the data involved: the
existing mitigations (`httpOnly`, `secure` in production, `sameSite:
"lax"`, a bounded TTL) exist specifically because the cookie value
itself is exactly as sensitive as the password that produced it, for the
duration of the session.

**Disposition**: no design change required. Recorded so
implementation-time decisions (e.g. "is it fine to log this header for
debugging") are made with this stated plainly, not assumed safe by
default. `milestone-8-design.md` §11 already redacts
`password`/`session_id` from any future `api-client.ts` logging — this
finding is the reasoning underneath why that redaction rule exists, made
explicit rather than implicit.

### 3.2 — Session-id indirection (a `web`-minted token mapped server-side to `api`'s) was considered and correctly rejected (CONFIRMED — not a gap)

The natural-sounding alternative: instead of relaying `api`'s literal
session id, `web` mints its **own** random session id, keeps a
server-side mapping (`web`'s own store, or a signed/encrypted cookie
payload) from that id to `api`'s real session id, and only ever puts the
`web`-minted id in the browser's cookie.

**This does not reduce the actual risk in this architecture, and adding
it would be complexity without a corresponding security benefit.**
Reasoning: `web` is the trusted intermediary either way. If an attacker
obtains a valid browser-held token — whether it's `api`'s literal
session id (current design) or a `web`-minted indirection token
(alternative) — the result is identical: the attacker can make `web`
issue fully-authenticated requests to `api` on the victim's behalf,
because that is precisely what a valid session token, of either kind,
authorizes `web` to do. Indirection would only add real protection if
`api`'s token had some additional exploitable property that a
`web`-minted one wouldn't — checked, and it doesn't: it is a 122-bit
random opaque value (§1), usable only against `api`, which is reachable
only from `web`'s own server over Railway's private network. There is no
second system an exposed `api` session id grants access to beyond what
an exposed `web`-minted indirection token would grant through `web`
itself.

**Disposition**: no design change. This is recorded as a
considered-and-rejected alternative (mirroring the project's existing
practice of recording deliberate non-changes, e.g.
`PrismaSurgeryRepository.save()`'s deferred participant-diffing) so a
future reviewer doesn't re-propose it as an unconsidered gap.

### 3.3 — Logout must clear the browser cookie unconditionally, even if invalidating `api`'s session fails (REQUIRED — design gap, not yet specified)

`milestone-8-design.md` §3 point 4 says logout "calls `DELETE /sessions`
on `api` ..., then clears `web_session` on the browser" but does not say
what happens if that `DELETE` call itself fails (network error, `api`
transiently unreachable). As written, a naive implementation could leave
the browser holding a `web_session` cookie whose underlying `api`
session was never invalidated — a real residual-access risk for
clinical data (the session stays fully valid until its natural 24h
expiry, on a device the physician believed they'd logged out of — a
shared/clinic workstation is exactly the plausible case this matters
for).

**Required, concrete**: the logout Server Action must clear
`web_session` on the browser **unconditionally**, regardless of whether
the `DELETE /sessions` call to `api` succeeded — a physician must never
end up in a state where clicking "log out" leaves them looking logged
out while the underlying token is still silently valid. If the `api`
call fails, log the failure server-side (never surfaced to the
physician as an error — from their side, logout must always visibly
succeed) so an orphaned still-valid `api` session can be identified,
without depending on 24h natural expiry as the only cleanup path.

### 3.4 — Login must fail closed if `api`'s response carries no extractable session id (REQUIRED — design gap, not yet specified)

Symmetric to 3.3: `milestone-8-design.md` §3 point 1–2 describes reading
`session_id` out of `api`'s `Set-Cookie` response header and storing it
as `web_session`. Not yet specified: what happens if that header is
missing or malformed (a genuinely possible failure — a network
intermediary stripping headers, an `api` version mismatch, a future
regression in `api` itself). An implementation that doesn't check for
this could set `web_session` to `undefined`/empty and let the physician
proceed as if authenticated.

**Required, concrete**: the login Server Action must treat "no valid
session id extracted from `api`'s response" as an authentication
failure — same handling as a `401`/rejected-credentials case (§7's error
table) — and must never call `setSessionCookie` with an empty or
undefined value. This is a fail-closed guard, not a redesign of the
mechanism.

### 3.5 — `secure` flag correctness depends on deployment configuration discipline, not just code (REQUIRED — a Railway/deployment-time check, not a code defect)

Both `api`'s existing cookie (`packages/http/src/shared/session-cookie.ts`)
and the design's `web_session` set `secure: process.env.NODE_ENV ===
"production"`. This is the standard idiom and is not wrong, but it means
correctness depends on every publicly-reachable deployment actually
setting `NODE_ENV=production` — not merely on the code being right. A
Railway environment that is reachable over the public internet (e.g. a
staging environment physicians or testers access over HTTPS) but was
deployed with `NODE_ENV` left at a non-production value would silently
ship `web_session` without the `Secure` attribute, weakening the cookie
exactly on a network-reachable deployment where it matters most.

**Required, concrete**: whoever wires Milestone 8/9's Railway
environment(s) must confirm `NODE_ENV=production` is set on every
environment reachable outside `localhost` — not assumed correct because
the code itself is standard. This is a deployment-configuration checklist
item, not a code change to this design.

### 3.6 — Everything else checked and found sound (CONFIRMED, no action needed)

Checked explicitly, each because a plausible-sounding concern exists in
general session-security literature — none found to be a real gap in
this specific design:

- **Session-token predictability**: `randomUUID()` — cryptographically
  random, not sequential, not derivable from `physicianId` or timing.
  Not guessable.
- **Session fixation**: `login` always calls
  `sessionRepository.create()`, minting a brand-new id server-side on
  every successful authentication — a client can never supply or
  influence the session id itself. No fixation vector.
- **CSRF on the login flow**: Next.js Server Actions carry built-in
  origin/Action-ID CSRF protection (already flagged in
  `milestone-8-design.md` §11, with the correct caveat to re-verify
  against the pinned Next.js version at implementation time — that
  caveat stands, not repeated as a new finding here).
- **Fail-open on `api` unreachability**: every read goes through
  `cache: "no-store"` (§9) and a real per-request `api` call — a network
  failure surfaces as a generic error (§7's `ApiUnexpectedError`), never
  stale or fabricated clinical data rendered as if current. Fails
  closed by construction.
- **Cross-environment token reuse**: an `api` session id is only
  meaningful against the exact Postgres `sessions` table it was created
  in — a `web_session` value issued against one environment's `api`
  cannot be replayed against a different environment's `api` (the row
  simply won't exist there). No cross-environment leak vector inherent
  to the relay design itself (environment/data-isolation policy — e.g.
  ensuring a staging environment never holds real clinical data at all —
  is a separate, adjacent policy question, not a defect in this
  mechanism).
- **Multiple concurrent sessions/devices**: `login` never checks for or
  invalidates a physician's existing session before creating a new one
  — each login is an independent row. Multiple devices/sessions are
  naturally supported, not a gap.
- **Log leakage of the session value**: confirmed by inspecting actual
  Fastify/pino output produced by this project's own test runs — request
  logging does not include the `cookie` header by default. The
  forward-looking rule in `milestone-8-design.md` §11 (redact
  `password`/`session_id` from any future `api-client.ts` logging) is
  the correct standing guard for `web`'s side; no gap found in `api`'s
  current logging.

## 4. What this review does not evaluate (adjacent, but out of scope)

- **`api`'s 24h fixed TTL with no idle timeout** — an existing Milestone
  3 decision, unaffected by whether `web` relays the token or holds it
  directly. Whether 24h/no-idle-timeout is the right policy for a
  clinical-data product is a legitimate question, but it is `api`'s
  policy to revisit, not something this relay design changes or should
  silently absorb responsibility for. **Flagged for the product owner as
  a separate, pre-existing item worth a deliberate look — not a
  Milestone 8 blocker**, since Milestone 8 inherits whatever TTL `api`
  decides, unchanged.
- **Regulatory/compliance session requirements** (e.g. a named framework
  requiring a specific idle-timeout or re-authentication policy) — no
  such framework has been named as in scope for this project (explicitly
  listed as deferred/unresolved by `epitaxy-project`'s own index). Not
  evaluated here; would change the TTL/idle-timeout answer above if one
  is ever named.
- **Compromise of `web`'s own hosting environment** — out of scope per
  §2; a hosting/infrastructure security question for Railway wiring, not
  a session-design question.

## 5. Verdict

**The `web_session`-relays-`api`'s-session-id design is approved as
architecturally sound**, on the following basis: the mechanism itself
introduces no new exposure beyond what `api`'s own session cookie
already carries (3.1), the one plausible-sounding alternative
(session-id indirection) was evaluated concretely and correctly rejected
as adding complexity without a security benefit in this specific
architecture (3.2), and every other standard session-security concern
checked against this design was found already handled correctly (3.6).

**Four items are required before/during implementation** — none of them
change the mechanism, all are small, concrete completions of the design
as written: logout must clear `web_session` unconditionally (3.3), login
must fail closed on a missing/malformed session id (3.4), the `Secure`
flag's correctness must be confirmed as a deployment-configuration
checklist item across every publicly-reachable Railway environment
(3.5), and `web_session`'s bearer-credential sensitivity should be
carried explicitly into any future logging/observability work (3.1,
already reflected in `milestone-8-design.md` §11).

This review recommends `milestone-8-design.md` §3 be updated to state
3.3 and 3.4 as explicit design requirements (not left implicit) before
implementation begins — see the corresponding edit applied there.

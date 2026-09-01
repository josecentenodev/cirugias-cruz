# Milestone 8 — Frontend Architecture Design

> This document turns `frontend-architecture-discovery.md`'s decisions
> (Next.js App Router, BFF pattern, Server-Components-by-default) into a
> concrete design: package structure, the BFF↔API boundary, session
> propagation, the Server/Client Component split, error handling, DTOs
> and mappers, and testing strategy — validated against the actual
> Milestone 1–7 endpoints and Application operations, not assumed.
> **Nothing in this document has been implemented.** `packages/web` does
> not exist yet. This is the design to build Milestone 8 against, in the
> same relationship `application-layer-discovery.md` had to Milestone 1.
>
> Read alongside `m4-m7-conformance-review.md` — its two actionable
> findings (request-body schemas on `resident.ts`/`research-study.ts`;
> `listResidents`/`getResident` Application operations) have since
> landed, so this design is now checked against the API as it actually
> is, not against a documented gap in it. See the discovery-pass note
> below for the re-verification.
>
> **Discovery-pass update (post M4–M7 fix pass, before implementation
> authorization)**: re-checked against the now-stabilized backend — no
> section below needed a substantive change; the two corrections applied
> are noted inline where they occur (§8's Resident flow, mainly cosmetic
> — the endpoints and response shapes did not change, only which layer
> handles the request). A dedicated security review of §3's `web_session`
> design (relaying `api`'s own session id in a `web`-owned cookie) was
> requested given this product handles clinical data — see
> `docs/architecture/milestone-8-session-security-review.md` for that
> review, done before any implementation is authorized.

---

## 1. How Next.js talks to `packages/http`

**Server-to-server only, over Railway's private network, with one thin
HTTP client module — never a generated client, never scattered `fetch`
calls.**

```
Browser ──(same-origin, web's own cookie)──▶ web (Next.js server)
                                                   │
                                                   │ server-to-server,
                                                   │ private network,
                                                   │ forwards session id
                                                   ▼
                                                  api (packages/http)
```

- In production: `api`'s Railway private DNS name
  (`${{http.RAILWAY_PRIVATE_DOMAIN}}`), reached only from `web`'s
  server-side code (Server Components, Server Actions, Route Handlers if
  any are ever needed — none are anticipated for Milestone 8's scope).
- In local dev: `api` runs on `localhost:<port>` (or the Railway TCP
  proxy, for testing against the shared dev database) — same client
  code, different base URL from an environment variable
  (`API_BASE_URL`), never hardcoded.
- The browser **never** receives `api`'s base URL, `api`'s cookie, or
  any direct reference to `api` in any HTML/JS it loads. This is the
  entire point of the BFF pattern (`frontend-architecture-discovery.md`
  §3) — re-affirmed here as a concrete rule: no client component, no
  inline script, no `NEXT_PUBLIC_*` env var may ever reference `api`'s
  URL.

## 2. Where backend access lives

One module, one responsibility: **`lib/api-client.ts`** is the _only_
file in `packages/web` allowed to call `fetch` against `api`. Nothing
else — no Server Component, no Server Action, no query/mapper file —
calls `fetch` directly.

```
packages/web/src/lib/api-client.ts
```

Responsibilities of `api-client.ts`, and nothing more:

- Build the request: base URL + path, method, JSON body, the forwarded
  session cookie (§3), the forwarded client IP header (§3.3).
- Parse the response: JSON body, or throw a typed error for non-2xx
  (§7) — this is the **one place** that turns an HTTP status code into
  a typed exception (`ApiAuthError`, `ApiNotFoundError`,
  `ApiDomainError`, `ApiUnexpectedError`); nothing above this layer ever
  branches on a raw numeric status code again.
- Nothing else. No caching decisions, no retry logic (not needed — this
  is a private, low-latency internal call, not a flaky third-party
  API), no business interpretation of the response body.

```ts
// lib/api-client.ts — shape, not final code
interface ApiClientOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  sessionId: string | undefined;
  clientIp: string; // see §3.3
}

async function apiRequest<T>(options: ApiClientOptions): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${options.path}`, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      cookie: options.sessionId ? `session_id=${options.sessionId}` : "",
      "x-forwarded-for": options.clientIp,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store", // clinical data must be current, never cached — see §9
  });

  if (!response.ok) throw await toApiError(response); // §7
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
```

Every `features/<slice>/queries.ts` and `features/<slice>/actions.ts`
calls `apiRequest`, never `fetch`. This is the single chokepoint that
makes "how do we forward the session/IP consistently" and "how do we
turn a 404 into a typed error" a solved problem once, not a rule every
feature has to remember to follow.

## 3. How the session propagates

**Two different cookies exist, on two different origins, and the
browser only ever sees one of them.**

```
Browser's cookie jar (web's origin):
  web_session = <opaque value web controls>     ← the ONLY cookie the browser holds

api's own session model (never touches the browser):
  session_id  = <api's own session token>       ← lives inside web's server only
```

The browser does **not** receive `api`'s `session_id` cookie, and does
not need to — `api` is never called from the browser. Concretely:

1. **Login**: a Client Component form submits to a Server Action
   (§5). The Server Action calls `POST /sessions` on `api` via
   `api-client.ts`. `api`'s response is a `Set-Cookie: session_id=...`
   header — but that response goes to `web`'s _server_, not to the
   browser. The Server Action reads `session_id` out of that response
   (via the `fetch` `Response`'s headers — Next.js's server-side `fetch`
   gives access to raw headers, unlike a browser `fetch`) and stores it
   server-side. **Required (see
   `milestone-8-session-security-review.md` §3.4): if no valid session
   id can be extracted from `api`'s response — a missing/malformed
   `Set-Cookie`, not merely a `401` — the Server Action must treat this
   as an authentication failure, exactly like a rejected credential, and
   must never call `setSessionCookie` with an empty or undefined value.
   Fail closed, not open.**
2. **Where "server-side" means, concretely**: `web` sets its own cookie
   on the browser — `web_session`, `httpOnly`, `sameSite: "lax"`,
   `secure` in production, same expiry as `api`'s session — whose value
   is `api`'s `session_id`. This is deliberately **not** a second,
   independent session concept; `web_session`'s value _is_ `api`'s
   session id, verbatim. `web` is not implementing its own auth system
   — it is relaying `api`'s session id to the browser under `web`'s own
   origin, so the cookie is same-site from the browser's perspective
   (this is the entire reason the BFF pattern was chosen — see
   `frontend-architecture-discovery.md` §3).
3. **Every subsequent request**: a Server Component or Server Action
   reads `web_session` from Next.js's `cookies()` API (server-only,
   never exposed to Client Components), and `api-client.ts` forwards
   that value as `api`'s `session_id` cookie on the server-to-server
   call. `lib/session.ts` (§5, below) is the one place `cookies()` is
   read for this purpose.
4. **Logout**: a Server Action calls `DELETE /sessions` on `api`
   (forwarding `web_session`'s value so `api` can invalidate the right
   row), then clears `web_session` on the browser. **Required (see
   `milestone-8-session-security-review.md` §3.3): `web_session` must be
   cleared on the browser unconditionally, even if the `DELETE /sessions`
   call to `api` fails (e.g. a transient network error) — a physician
   must never see "logged out" while the underlying `api` session stays
   silently valid. Log a failed invalidation server-side (never surfaced
   to the physician — logout must always visibly succeed from their
   side) so an orphaned session can be found rather than relying solely
   on its 24h natural expiry.**

**`lib/session.ts`** owns this, and is the only file that touches
Next.js's `cookies()` for session purposes:

```ts
// lib/session.ts — shape, not final code
export async function getSessionId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get("web_session")?.value;
}

export async function setSessionCookie(sessionId: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set("web_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete("web_session");
}
```

### 3.1 Does the browser receive any cookie from `api`?

**No.** The browser receives exactly one cookie, `web_session`, set by
`web`'s own server, on `web`'s own origin. `api`'s `Set-Cookie` response
header is consumed and discarded by `web`'s server-side `fetch` call —
it never reaches the browser's `Set-Cookie` handling at all, because the
browser never made that request. This is worth stating explicitly
because it's easy to assume a BFF "forwards" the backend's cookie
verbatim to the browser — it does not; it **relays the session id
inside its own cookie**, which is a different (and, per
`frontend-architecture-discovery.md` §3, deliberately safer) mechanism.

### 3.2 How do we avoid duplicating authentication logic?

By construction, not by discipline: **`web` has zero authentication
logic of its own.** It does not verify passwords, does not decide
whether a session is valid, does not know `api`'s session-storage
schema. Every one of those decisions still happens exactly once, in
`api` (`login`/`logout`/`requireAuth`, `packages/application`'s
`PhysicianCredentialRepository`/`SessionRepository`, unchanged).

The one thing `web` _does_ decide is narrower and purely a routing
concern: "does a request to a protected page have a `web_session`
cookie at all, and should it therefore attempt the page or redirect to
`/login`." This is a `middleware.ts` (or per-layout) check for cookie
_presence_, not cookie _validity_ — validity is still `api`'s call.

**Concretely**: `web`'s middleware checks `web_session` exists →
redirects to `/login` if not. It does **not** attempt to decode,
verify, or introspect the session id itself (it's an opaque token from
`web`'s perspective, exactly as it already is from a browser's
perspective for a normal cookie-session app). The _actual_ trust
decision — "is this session id still valid, and whose is it" — is made
exactly once per request, inside `api`, by the same `requireAuth`
`preHandler` that already exists and is unchanged by Milestone 8. If
`web_session` is present but stale (expired, or `api` was restarted with
a wiped session table, or — 3.4), the Server Component/Action's call to
`api` gets a `401`, and the shared error-handling layer (§7) is what
redirects to `/login` and clears the stale cookie at that point — not a
second, parallel validity check living in `web`.

This is the concrete answer to "how do we avoid duplicating
authentication logic": there is exactly one place that can say "yes,
this session is valid" (`api`), and exactly one place that decides "does
this look like a request that should even try" (`web`'s middleware,
which only checks cookie _presence_). Nothing in `web` re-implements
session validation, password checking, or expiry logic.

### 3.3 Forwarded client IP

Per `frontend-architecture-discovery.md` §3 and Milestone 7's
`forwardedClientIp` (`packages/http/src/shared/rate-limit-key.ts`),
`web` must forward the real browser client's IP to `api` on every
request, via `X-Forwarded-For`, or `api`'s rate limiting on
`/sessions`/`/physicians` collapses every physician into one shared
bucket (`web`'s own Railway-internal address). `api-client.ts` reads the
inbound request's own forwarded-IP chain (Railway's edge already sets
this correctly for `web` itself; Next.js exposes it via
`headers().get("x-forwarded-for")` in a Server Action/Component) and
re-forwards it, unmodified, as `X-Forwarded-For` on the `api` call. This
is the other half of the mechanism `packages/http`'s Milestone 7 already
implemented and is waiting for.

### 3.4 What if `api`'s session table is empty (fresh deploy) but a browser still has `web_session`?

Not a new problem Milestone 8 introduces — this is exactly the same
failure mode a cookie-session app already handles today via `api`'s own
`requireAuth` returning `401` for an unknown session id. Milestone 8's
error-handling layer (§7) treats a `401` from any `api` call, on any
page, identically: clear `web_session`, redirect to `/login`. No new
mechanism needed.

## 4. Package structure

```
packages/web/
  src/
    app/
      (auth)/
        login/
          page.tsx                    # Server Component: form shell + <LoginForm/>
        layout.tsx                    # no dashboard chrome
      (dashboard)/
        layout.tsx                    # dashboard chrome, requires session (middleware handles the redirect)
        page.tsx                      # dashboard landing — see §8 for what this actually shows
        patients/
          page.tsx                    # Server Component: list
          new/page.tsx                 # Server Component page hosting a Client form
          [id]/page.tsx                 # Server Component: detail
        procedure-types/
          page.tsx
          new/page.tsx
        surgeries/
          page.tsx
          new/page.tsx
          [id]/
            page.tsx                    # detail + Control history + inline record/modify Control
        residents/
          page.tsx
          new/page.tsx
        research-studies/
          page.tsx
          new/page.tsx
          [id]/page.tsx                  # detail + lifecycle actions
      layout.tsx                      # root layout: fonts, global styles, no data fetching
      not-found.tsx                   # global 404 (§7)
      error.tsx                       # global unexpected-error boundary (§7)
    features/
      patients/
        queries.ts                    # server-side reads — calls api-client
        actions.ts                    # Server Actions — calls api-client
        dtos.ts                       # wire-shape types, matching api's actual response
        mappers.ts                    # api DTO -> view-model the components render
        schemas.ts                    # zod input validation for forms/Server Actions (§10)
        components/
          PatientList.tsx             # Server Component
          PatientForm.tsx             # "use client" — the one interactive piece
      procedure-types/  (same shape)
      surgeries/         (same shape, plus a controls/ sub-slice: record/modify Control)
      residents/         (same shape)
      research-studies/  (same shape, plus a status-transition action)
      auth/
        actions.ts                    # login/logout Server Actions
        schemas.ts
        components/
          LoginForm.tsx                # "use client"
    lib/
      api-client.ts                   # §2 — the only fetch boundary
      api-errors.ts                   # §7 — typed error classes + the one status->error mapping
      session.ts                      # §3 — the only cookies() access for session purposes
      client-ip.ts                    # §3.3 — reads/forwards the real client IP
    middleware.ts                     # §3.2 — cookie-presence check only, redirects to /login
```

**Why feature-based, not `components/`+`hooks/`+`pages/`**: this mirrors
`frontend-architecture-discovery.md` §5's decision, validated now
against the real backend shape — `packages/http`'s own five route files
(`auth`, `core-loop` — split further below, `resident`,
`research-study`) map cleanly to `features/{auth,patients,procedure-types,
surgeries,residents,research-studies}` (`core-loop.ts` is one file on
the backend but covers three distinct resources, so it's one route file
→ three frontend features, which is fine — the frontend's vertical
slices are about _resource_, not about mirroring backend file
boundaries 1:1).

## 5. Where each concern lives — concrete rules

| Concern                                                 | Lives in                                                                                                                          | Never in                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pages (routes)                                          | `app/**/page.tsx`                                                                                                                 | —                                                                                                     |
| Server Actions (writes)                                 | `features/<slice>/actions.ts`                                                                                                     | inline in a page or component file, or in `app/**`                                                    |
| Reads (queries)                                         | `features/<slice>/queries.ts`, called directly from a Server Component                                                            | a Client Component, a `useEffect`, a Route Handler                                                    |
| The `fetch` boundary to `api`                           | `lib/api-client.ts` only                                                                                                          | anywhere else, including `queries.ts`/`actions.ts` themselves (they call `apiRequest`, never `fetch`) |
| DTOs (wire shapes)                                      | `features/<slice>/dtos.ts`                                                                                                        | inferred inline from `api-client` return types                                                        |
| Mappers (DTO → view-model)                              | `features/<slice>/mappers.ts`                                                                                                     | inside a component (a component receives an already-mapped view-model, never a raw DTO)               |
| Forms                                                   | `features/<slice>/components/*Form.tsx`, `"use client"`                                                                           | a Server Component; a page component directly                                                         |
| Non-interactive UI (lists, detail views, static layout) | `features/<slice>/components/*.tsx`, Server Components by default                                                                 | `"use client"` unless §6's test is met                                                                |
| Input validation (shape/required/type)                  | `features/<slice>/schemas.ts` (zod), used by both the form's client-side feedback and the Server Action's own re-validation (§10) | duplicated ad hoc in the Server Action body, or skipped client-side entirely                          |
| Error handling / status→message mapping                 | `lib/api-errors.ts` (typed errors) + `app/error.tsx`/`app/not-found.tsx`/per-page error UI (§7)                                   | a `try/catch` with bespoke handling repeated in every Server Action                                   |
| Session read/write                                      | `lib/session.ts` only                                                                                                             | any Server Action/Component calling `cookies()` directly for this purpose                             |
| Client-IP forwarding                                    | `lib/client-ip.ts`, used by `api-client.ts`                                                                                       | —                                                                                                     |

## 6. Server Component vs. Client Component — the concrete test

**Default: Server Component. `"use client"` only when the component
itself — not its parent page, not its sibling — needs one of:**

1. **Local interactive state** (`useState`/`useReducer`) — e.g. a form's
   "is this field currently valid," a multi-step wizard's current step,
   an optimistic "submitting..." flag.
2. **A DOM/browser event handler** that must run in the browser
   (`onChange`, `onSubmit`'s client-side pre-validation before handing
   off to the Server Action, `onClick` for something that isn't just
   "navigate" — navigation is a plain `<Link>`, never a click handler).
3. **A browser-only API** — none identified as needed for Milestone 8's
   scope (no `localStorage`, no `navigator.*`, no `window.*` dependency
   in any of the six vertical slices) — if one is later needed for a
   specific widget, that one component becomes a Client Component, not
   its containing page.
4. **A third-party client-only library** — none anticipated; if a date
   picker or similar needs one, it stays scoped to exactly the input
   component that renders it.

**Concrete per-slice application** (validated against the real routes,
not assumed):

- `patients/page.tsx` (list), `patients/[id]/page.tsx` (detail),
  every other `page.tsx` that only _reads_ — **Server Component**. Data
  comes from `queries.ts`, rendered directly, no client-side fetch.
- `PatientForm.tsx`, `SurgeryForm.tsx`, `ControlForm.tsx`,
  `ResidentForm.tsx`, `ResearchStudyForm.tsx`, `LoginForm.tsx` — **Client
  Component**. Each wraps a `<form action={serverAction}>` (React's
  native Server-Action form binding — no `onSubmit` `fetch` call
  anywhere), with local state limited to client-side validation feedback
  and a pending/submitting indicator (`useFormStatus`/`useActionState`).
  The form's `action` is a Server Action imported from
  `features/<slice>/actions.ts` — the Client Component never imports
  `api-client.ts` directly, and never could (it's a server-only module;
  importing it from a Client Component is a build error by construction,
  which is a second, structural enforcement of the BFF boundary beyond
  code review).
- `ResearchStudyDetail`'s lifecycle buttons (move to IN_PROGRESS,
  complete, reopen) — **Client Component**, but a thin one: a button
  whose `onClick` calls a Server Action directly (no form needed for a
  no-input action) and shows a pending state. Not the whole detail page
  — only the button cluster.
- `SurgeryDetail`'s Control list — **Server Component** (pure read); the
  "record a Control" / "modify a Control" affordance on that same page
  is a nested Client Component form, same pattern as any other form.
- Nothing in this design converts an entire page to `"use client"` for
  convenience. The rule from `frontend-architecture-discovery.md` §4
  ("anything that doesn't need `useState`/`useEffect`/an event handler
  should not have `"use client"`") is applied per-component, and every
  page listed above keeps its outer `page.tsx` as a Server Component
  that composes one or more small Client Components for the genuinely
  interactive pieces.

## 7. Error handling — 401, 403, 404, and domain errors

Grounded in `m4-m7-conformance-review.md` §2.5's finding: **`api` never
returns `403`.** The design below reflects that reality rather than
building a UI affordance for a status code that cannot occur.

`lib/api-errors.ts` is the one place that maps an `api` response to a
typed error:

```ts
export class ApiAuthError extends Error {} // api returned 401
export class ApiNotFoundError extends Error {} // api returned 404
export class ApiDomainError extends Error {
  // api returned 400 (DomainError)
  constructor(message: string) {
    super(message);
  }
}
export class ApiUnexpectedError extends Error {} // api returned 500, or a network failure
```

| `api` status                                   | Meaning                                                                                                                                                      | `web`'s handling                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`                                          | No session, or session expired/invalid (`requireAuth`)                                                                                                       | Clear `web_session` (§3), redirect to `/login`. In a Server Component this is a `redirect()` call; in a Server Action, the action returns a result the calling Client Component interprets as "redirect me." Never shown as an inline error message — a physician should never see "401" text.                                                                                                                    |
| `404`                                          | Resource doesn't exist, **or belongs to another physician's tenant** (deliberately indistinguishable — §2.5)                                                 | Render the route's own `not-found.tsx` (Next.js convention) or an inline "not found" state for a list-item action. Message is generic ("Patient not found") — never implies "you don't have permission," since that would leak tenant existence, undoing the backend's own anti-enumeration design.                                                                                                               |
| `400`                                          | A `DomainError` — a genuine business-rule rejection (invalid input reaching Domain, a tenant-boundary write violation per §2.5, an invalid state transition) | The `DomainError`'s message **is** the user-facing message — Domain's own error messages are already written to be meaningful to the acting physician (e.g. "cannot complete a research study that is not IN_PROGRESS"), so this is displayed as-is, inline on the form/action that triggered it. Never re-worded or re-interpreted by `web` — `web` does not maintain its own copy of "what domain errors mean." |
| `500` / network failure / anything unparseable | Truly unexpected — a bug, not a user-triggerable case                                                                                                        | A generic "Something went wrong, try again" — via `app/error.tsx` for a page-level failure, or an inline generic message for a Server Action failure. The actual error is logged server-side (§9 — never with clinical data in the log line), never shown to the physician verbatim (avoids leaking stack traces/internal details to the client — see §11).                                                       |

**No route/component ever branches on a raw numeric status code.**
Every call through `api-client.ts` either returns data or throws one of
the four typed errors above — `queries.ts`/`actions.ts` and the
components above them catch by type (`instanceof ApiNotFoundError`,
etc.), never by re-parsing a status code a second time.

**Server Actions specifically**: a Server Action cannot simply `throw`
and expect Next.js to render a nice error — an uncaught throw in a
Server Action surfaces as a generic, unstyled error in the client
(effectively the same as an uncaught render error). Every Server Action
in this design instead **catches internally** and returns a typed result
(`{ ok: true, data } | { ok: false, error: { kind, message } }`), which
its calling Client Component reads to render the inline message from
the table above, or trigger the redirect for `401`. This is the
concrete mechanism, not just a principle — every `actions.ts` file
follows this same return shape, so every form component's error-handling
code looks the same regardless of which slice it belongs to.

## 8. Minimal navigable flow — validated against real endpoints

```
/login  (unauthenticated)
   │  POST /sessions  (api)
   ▼
/  (dashboard landing)
   │
   ├── /patients                              GET  /patients
   │     ├── /patients/new                     POST /patients
   │     └── /patients/:id                     GET  /patients/:id
   │
   ├── /procedure-types                        GET  /procedure-types
   │     └── /procedure-types/new               POST /procedure-types
   │
   ├── /surgeries                              GET  /surgeries
   │     ├── /surgeries/new                     POST /surgeries
   │     └── /surgeries/:id                     GET  /surgeries/:id
   │           ├── record a Control (inline)     POST  /surgeries/:id/controls
   │           └── modify a Control (inline)     PATCH /surgeries/:id/controls/:controlId
   │
   ├── /residents                              GET  /residents
   │     └── /residents/new                     POST /residents
   │           # assign/remove a Resident on a Surgery happens on the
   │           # Surgery detail page (POST/DELETE .../residents), not
   │           # its own route — see note below
   │
   └── /research-studies                       GET  /research-studies
         ├── /research-studies/new               POST /research-studies
         └── /research-studies/:id               GET  /research-studies/:id
               ├── edit hypothesis/results/analysis/conclusion (inline)  PATCH /research-studies/:id
               ├── add/remove a Surgery (inline)   POST/DELETE /research-studies/:id/surgeries[/:surgeryId]
               ├── lifecycle transitions (inline)   POST /research-studies/:id/status
               └── delete (DRAFT only)              DELETE /research-studies/:id
```

**One correction against the flow the user sketched, found by checking
real endpoints rather than assuming the tree** (a second correction,
about `GET /residents`/`GET /residents/:id` routing through Application
via `listResidents`/`getResident` rather than calling
`ResidentRepository` directly, was found at the same time and has since
been fixed — see `m4-m7-conformance-review.md` §2.2 — so it no longer
needs calling out as a caveat here; `features/residents/queries.ts` can
be written against the API as it exists today):

1. **Assigning/removing a Resident on a Surgery is not a Resident-slice
   page** — the actual endpoints are `POST /surgeries/:id/residents` and
   `DELETE /surgeries/:id/residents/:residentId`, i.e. this is Surgery
   data, scoped to a specific Surgery. The navigable flow reflects that:
   this action lives on `surgeries/[id]/page.tsx` (pick a Resident from
   a dropdown sourced from `GET /residents`, submit), not on a
   `residents/[id]/page.tsx` "assign to a surgery" flow — there is no
   `GET /residents/:id`-adjacent assignment endpoint, and inventing a
   `residents/[id]` action that calls a Surgery-scoped endpoint would
   put Surgery-shaped logic in the Resident feature slice for no reason.
   (A Resident _detail_ page, `residents/[id]/page.tsx`, can still exist
   to show a Resident's own info — it's just not where the assignment
   action lives.)

No endpoint exists for `research-studies/new` as a bare "create with
nothing" — checked: `POST /research-studies`'s body fields
(`hypothesis`/`results`/`analysis`/`conclusion`) are all optional, so
"create empty, fill in details after" and "fill in details on create"
are both valid against the real contract — the flow above assumes the
simpler one (create, then edit inline on the detail page), matching how
every other resource's create+detail flow already works.

## 9. Data freshness / caching

Per `frontend-architecture-discovery.md` §2: **no caching of clinical
data.** Every `apiRequest` call in `api-client.ts` sets
`cache: "no-store"` — not Next.js's default `fetch` caching behavior,
which would otherwise memoize/cache a GET across requests in ways that
are wrong for data a physician needs to see as current (a Control
recorded seconds ago by another session, a Resident just registered).
This is a explicit, load-bearing setting, not an oversight to "optimize
later" — Milestone 8 has no performance requirement that would justify
trading correctness for it, and the product itself (`DOMAIN.md`) is
explicit that Controls exist to track a Surgery's state over time,
which is precisely the kind of data that must never be shown stale.

## 10. Input validation

Two layers, both real, neither duplicating the other:

1. **Client-side (in the Client Component form), via
   `features/<slice>/schemas.ts` (zod)**: shape/required/type feedback
   _before_ submission — the same reason `packages/http`'s JSON-schema
   validation exists, applied one layer earlier for UX (immediate
   feedback, no round-trip needed to learn a required field is empty).
2. **Server Action re-validation, using the _same_ `schemas.ts`
   file**: a Server Action never trusts that client-side validation
   actually ran (a malicious or buggy client could call the Server
   Action directly, bypassing the form) — it parses the same zod schema
   against the received `FormData`/arguments before calling
   `api-client.ts`. This is the client-side equivalent of `packages/http`'s
   own JSON-schema layer — structural validation only, never a Domain
   business rule (e.g. "hypothesis must be non-empty if provided" is not
   a rule that exists in Domain, so it must not be invented here
   either — checked against `research-study.ts`'s actual `updateHypothesis`
   Domain method, which has no such constraint).

**What `schemas.ts` explicitly does not validate**: anything that is a
Domain business rule rather than a shape constraint (a Surgery's
`performedAt` being a sensible date relative to today, a Resident's
removal being blocked once they've participated, a Research Study's
transition guards). Those remain `api`'s (and ultimately Domain's)
responsibility — `web` submits the request and displays whatever
`DomainError` message comes back (§7), it does not pre-guess the
business rule client-side. This mirrors exactly the discipline
`packages/http`'s own schemas already follow (`m4-m7-conformance-review.md`
confirms no schema anywhere duplicates a Domain rule) — Milestone 8
inherits, not reinvents, that boundary.

## 11. Security review

Per the explicit standing rule (MVP ≠ disposable implementation), each
item below was checked against this design, not assumed safe by
default. **The session-relay mechanism itself (§3) received a dedicated,
deeper review given this product handles clinical data — see
`milestone-8-session-security-review.md`.** Verdict: architecturally
approved; four small, concrete requirements from that review are folded
into §3 above (fail-closed login/logout handling) and this section
(the `secure`-flag deployment-configuration item below). The summary
points below restate the parts of that review most relevant to this
section's checklist format; the dedicated review has the full reasoning,
including the alternative (session-id indirection) that was considered
and correctly rejected.

- **Session cookie (`web_session`)**: `httpOnly` (JS on the page can
  never read it — mitigates XSS exfiltration of the session), `secure`
  in production (never sent over plain HTTP — **but this depends on
  every publicly-reachable Railway environment actually setting
  `NODE_ENV=production` at deploy time, not merely on the code being
  correct; confirm this as a deployment checklist item, not an assumed
  fact — see `milestone-8-session-security-review.md` §3.5**),
  `sameSite: "lax"` (the same baseline CSRF mitigation `api`'s own
  `session_id` cookie already uses — see §11.1 for why this is
  sufficient here too), matching expiry to `api`'s own session lifetime
  (no independent, longer-lived `web` session that outlives the `api`
  session it's relaying). Its value is a bearer-equivalent credential —
  identical in blast radius to exposing `api`'s own session cookie
  directly (confirmed, not a new risk the relay introduces — see
  `milestone-8-session-security-review.md` §3.1) — treat it with that
  sensitivity in any future logging/observability work (see "Clinical
  data in logs" below).
- **CSRF**: Server Actions have a **built-in** CSRF protection in
  Next.js (an origin/host check on the framework-generated Action ID,
  enforced automatically, not something Milestone 8 has to implement) —
  combined with `sameSite: "lax"` on `web_session`, a cross-site
  `<form>` POST cannot both carry the cookie _and_ pass Next.js's own
  Action-origin check. No separate CSRF token mechanism is being added,
  matching the same reasoning `packages/http`'s own
  `session-cookie.ts` comment already gives for not adding one there.
  **This should be re-confirmed against the specific Next.js version
  pinned when Milestone 8 is implemented** — Server Actions' CSRF
  protection has evolved across Next.js versions; treat this line as a
  thing to verify against the installed version's changelog at
  implementation time, not as a permanently-settled fact.
- **Input validation**: covered in §10 — real, two-layered, no gaps
  identified against the endpoints reviewed.
- **Accidental credential exposure**: `password` (registration/login)
  never appears in a URL, a client-side log, or `localStorage`/
  `sessionStorage` — it exists only as a Server Action argument, passed
  straight through to `api-client.ts`'s request body over the private
  network. `api-client.ts`'s own request/response logging (if any is
  ever added for debugging) must redact `password`/`session_id` fields —
  recorded here as a rule for whoever adds logging, not yet a concrete
  gap since no logging exists yet in this design.
- **Errors sent to the client**: covered in §7 — a `500`/unexpected
  error's real message/stack is never forwarded to the browser, only a
  generic message; the four typed `Api*Error` classes carry exactly the
  information (`api`'s own `DomainError`/`NotFoundError` messages,
  already written to be safely user-facing by Domain itself) that's
  safe to show.
- **Server Component caching**: covered in §9 — `cache: "no-store"` on
  every `api` call is itself a security-adjacent decision, not just a
  correctness one: without it, Next.js's default fetch memoization could
  serve one physician's previously-fetched data to a different request
  in edge cases involving shared build-time/ISR caching — moot for a
  fully dynamic, per-request-authenticated app, but worth stating
  `no-store` closes that door explicitly rather than by accident.
- **Clinical data in logs**: no `console.log`/structured logging of
  request/response bodies is included in this design. If observability
  is added later (out of scope for Milestone 8 per
  `frontend-architecture-discovery.md` §6), it must redact Control
  observations, Patient/Resident PII fields, and research study text
  fields — recorded as a constraint on that future work, not a gap in
  this one (nothing in this design logs clinical data today).
- **Railway secrets**: `API_BASE_URL` (and, if ever needed, any
  server-only secret) is a Railway service-level environment variable
  on `web`, never a `NEXT_PUBLIC_*` variable (which Next.js inlines into
  client-side bundles at build time — the one mechanism that would leak
  a private-network URL or secret straight into the browser). This
  design introduces no secret beyond `API_BASE_URL` itself, which is not
  sensitive in the credential sense but is still kept server-only on
  principle (no reason for the browser to ever see it).
- **Response headers on `web` itself**: per
  `frontend-architecture-discovery.md`'s note (moved here from
  Milestone 7 because `web`, not `api`, is the actual public-facing
  surface) — `web` needs its own security headers (CSP, etc.) via
  Next.js's `headers()`/middleware, separate from and in addition to
  `api`'s Milestone-7 `@fastify/helmet` headers, which only cover `api`'s
  own (private, non-public) responses. This is in scope for Milestone
  8's own Definition of Done, not assumed already covered by Milestone 7.

### 11.1 Why `SameSite=Lax` is still sufficient for `web_session`

Worth stating explicitly since it's the same question
`frontend-architecture-discovery.md` §3 answered for `api`'s cookie, now
asked again for `web`'s: `web_session` is set on `web`'s own origin, sent
only in same-site requests to `web`'s own pages/Server Actions. There is
no cross-origin actor that legitimately needs it (unlike, hypothetically,
an `api` cookie that a separate `web` origin might have needed under the
rejected cross-origin design). `SameSite=Lax` still allows top-level
navigation (a physician clicking a link from an email/bookmark lands
logged in, which is desired), while blocking the cross-site POST/fetch
cases that matter for CSRF. No scenario in this design needs
`SameSite=None`.

## 12. What must NOT enter `packages/web`

Restated as concrete, checkable rules (`frontend-architecture-discovery.md`
§7 already states the principle; this is the specific list against the
actual entities involved):

- **No Domain logic of any kind.** `Surgery`'s state machine,
  `Control`'s authorship rules, `ResearchStudy`'s lifecycle transition
  guards, `ProcedureType`'s no-deletion rule, `Resident`'s
  immutable-once-participated rule (ADR 0007) — none of these are
  re-implemented, re-checked, or even partially duplicated in `web`.
  `web` submits a request and renders whatever `api` decides — including
  rendering a rejection (§7's `400` handling) — it never pre-decides
  whether an action _should_ succeed beyond the shape-level validation
  in §10.
- **No tenant/authorization logic beyond "redirect to `/login` if no
  session cookie."** Every actual tenant check (does this Patient/
  Surgery/Resident/Research Study belong to the logged-in physician)
  stays exactly where it already is — Application/Domain, reached
  through `api`. `web` does not maintain a client-side notion of "which
  resources belong to the current user" beyond simply rendering the list
  `api` already scoped and returned.
- **No independent persistence.** No local database, no
  `packages/web`-owned Prisma schema, no duplicated copy of Patient/
  Surgery/etc. data outside of what's fetched per-request and rendered.
  (Browser `localStorage`/`sessionStorage` for a genuinely
  frontend-only, non-clinical convenience — e.g. "which dashboard tab
  was last open" — is not "persistence" in this sense and is not
  prohibited, but no clinical data belongs there; see §11's logging note
  for the same boundary applied to data-at-rest instead of data-in-transit.)
- **No independent DTO shapes invented ahead of the backend.** Every
  `features/<slice>/dtos.ts` type is written to match what the
  corresponding `api` route _actually_ returns (validated per-slice in
  §8, not assumed) — `web` does not get to decide a resource "should"
  have a field `api` doesn't send.
- **No re-implementation of `api`'s error semantics.** Covered in §7 —
  `web` interprets `DomainError` messages, it does not maintain its own
  parallel list of "what could go wrong" per action.

## 13. Testing strategy

Mirroring the discipline `application-layer-discovery.md` and each
backend milestone already established — test at the layer where the
logic actually lives, don't duplicate coverage across layers:

- **`lib/api-client.ts` and `lib/api-errors.ts`**: unit tests against a
  mocked `fetch` — proves the four-way status→typed-error mapping (§7)
  and that `cache: "no-store"`/the session cookie/the forwarded-IP
  header are always set correctly. This is the one place worth genuine
  unit-test density, since every feature slice depends on it being
  right.
- **`features/<slice>/mappers.ts`**: unit tests — given a known `api`
  response shape (fixture, not a live call), the mapper produces the
  expected view-model. Pure functions, cheap to test exhaustively.
- **`features/<slice>/schemas.ts`**: unit tests for the zod schemas —
  valid input passes, each documented required/shape rule rejects
  correctly. Explicitly _not_ testing Domain rules here (§10) — there's
  nothing Domain-shaped in these schemas to test.
- **Server Actions**: integration-style tests calling the action
  function directly (not through a rendered form) against a **mocked
  `api-client`**, not a real `api` — proves the action calls the right
  endpoint with the right shape and maps a thrown `Api*Error` to the
  right `{ ok: false, error }` result (§7). This does not re-prove
  `api`'s own business rules — those are already proven by
  `packages/http`'s own e2e suite; re-testing them here would be exactly
  the kind of duplicated coverage the project has avoided at every
  other layer boundary so far.
- **A small number of genuine browser-level E2E tests** (Playwright, per
  `frontend-architecture-discovery.md` §6 — tool choice still open, not
  decided by this document) — covering the full navigable flow in §8,
  against a real `web` + real `api` + real (test) Postgres, the same
  rigor pattern used for `packages/http`'s own e2e suites. This is the
  first point in the whole project where a genuine
  browser-drives-the-UI test exists — it proves the UI correctly drives
  the already-proven backend, it does not re-prove the backend itself.
  Scope: one full-workflow walkthrough (register → login → create a
  Patient/ProcedureType/Surgery → record a Control → register a Resident
  → assign to the Surgery → create a Research Study → move it through
  its lifecycle) plus the `401`-redirect and one `404`-tenant-isolation
  case, mirroring exactly what `packages/http`'s own e2e suites already
  prove server-side, now proven reachable through the UI.
- **What is explicitly not re-tested here**: any Domain invariant, any
  Application-layer orchestration rule, any Infrastructure persistence
  detail — all already covered by 81+97+45+23 passing tests in
  `packages/domain`/`application`/`infrastructure`/`http`. Milestone 8's
  test suite proves the UI is a correct client of an already-correct
  API, nothing more.

## 14. Open items this document deliberately does not decide

- Component library / styling approach — unchanged from
  `frontend-architecture-discovery.md` §6, still explicitly out of
  scope until usability requires a decision.
  the specific E2E tool (Playwright vs. alternative) — a tooling choice
  for whoever starts Milestone 8's implementation, not an architecture
  question.
- Whether Milestone 8 needs its own `packages/web`-level rate limiting
  on the login form beyond what `api` already enforces (leaning "no,
  `api`'s Milestone-7 limiter is sufficient since `web` forwards the
  real client IP" — but not a closed decision, flagged for whoever
  implements §11 to confirm against the actual login-abuse threat model
  at that time).

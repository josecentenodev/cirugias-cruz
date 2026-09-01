# Frontend Architecture — Discovery

> This is an architecture document, not a product-decision document. It
> records the reasoning behind the frontend technology and structure
> decisions made during the post-Milestone-3 MVP replanning pass, in the
> same spirit as `application-layer-discovery.md` does for the backend.
> Nothing here has been implemented yet — `packages/web` does not exist
> at the time of writing. This document exists so Milestone 8
> (Minimal physician-facing frontend) has an approved design to build
> against, rather than starting from a blank framework decision.

---

## 1. Decision

**Framework**: Next.js, App Router, in a new workspace package
`packages/web`.

**Architecture pattern**: `packages/web` runs as a **Backend-For-Frontend
(BFF)**. The browser only ever talks to `web` — never directly to
`packages/http` (`api`). `web`'s own Next.js server is the one client of
`api`, calling it server-to-server.

**Rendering strategy**: Server Components by default. Client Components
(`"use client"`) are the deliberate exception, reserved for forms and
components that genuinely need browser-side interactivity — not the
default posture.

**Data flow**: reads happen in Server Components via direct server-side
calls to `api` (no client-side fetch waterfall, no loading spinners for
data that's known at request time). Writes happen through **Server
Actions** that call `api`'s existing write endpoints — Server Actions
are a thin transport, not a place to duplicate business logic that
already lives in `packages/application`/`packages/domain`.

**Structure**: feature-based, using App Router route groups — one group
per vertical slice (Patient, ProcedureType, Surgery, Resident, Research),
mirroring the backend's own package structure rather than a generic
`components/` + `pages/` split.

---

## 2. Why Next.js, specifically

The product owner is already a Next.js specialist — using it is the
option requiring the least new tooling risk, not merely a popular
default. The concern raised alongside that expertise was real: the App
Router's reputation for being "tedious" comes almost entirely from
fighting RSC caching semantics and forcing SSR/ISR patterns onto content
that doesn't need them (public, SEO-sensitive, high-traffic pages).

**None of that applies here.** Epitaxy's frontend is an authenticated,
private, low-traffic clinical tool. It has no SEO surface, no public
content, and no caching win worth chasing — clinical data (a Control's
observations, a Surgery's history) needs to be current, not cached. The
frontend can therefore lean on Next.js's simplest posture — Server
Components for reads, Server Actions for writes, no aggressive
`revalidate`/`fetch cache` tuning, no route segment config beyond the
default — and sidestep the exact machinery that makes the App Router
feel heavy elsewhere.

## 3. Why BFF instead of a CORS-facing API

The alternative — `web` and `api` as two independently browser-reachable
Railway services, `web` calling `api` directly from client-side
JavaScript — was the more "obvious" shape given the "api.\* / web.\*"
framing the decision started from. It was rejected for a concrete,
technical reason, not a stylistic one:

`packages/http`'s session is a `httpOnly`/`SameSite=Lax` cookie. If the
browser calls `api` directly and `api` lives on a different origin than
`web`, that's a cross-site request from the browser's perspective —
`SameSite=Lax` does not attach the cookie to it. The fix would be
`SameSite=None; Secure`, which works, but is fragile in exactly the way
the product owner said not to accept: some browsers (Safari's ITP is the
most aggressive) treat `SameSite=None` cookies as third-party cookies
and block or expire them more readily, which would manifest as
physicians being silently logged out mid-session for reasons that have
nothing to do with the product. That is precisely a "shortcut that will
later require architectural replacement."

The BFF pattern avoids the problem at its root: the browser only ever
talks to `web`, on `web`'s own origin, with an ordinary same-site
session cookie. `web`'s server is the one making cross-service calls to
`api`, and that call is server-to-server — no browser, no `SameSite`
question, no CORS preflight, no cookie-sharing concern at all.

**Consequence for `api`'s exposure**: since the browser never talks to
`api` directly, `api` does not need to be reachable from the public
internet at all. The two Railway services can communicate over Railway's
private network (`api.railway.internal`) instead. This has a real
security benefit beyond convenience: `api` has zero public attack
surface. This is a leaning, not yet a closed decision — see
`docs/architecture/ROADMAP.md`'s Planning Decisions for the one open
item this creates (whether `api` should ever also be reachable publicly,
e.g. for a future mobile client).

## 4. Why "as little client-side React as possible"

This was an explicit product-owner instruction, not a Next.js-specific
idea, but Next.js's Server Components model is what makes it
straightforward to honor rather than fight. Concretely:

- A list of a physician's Patients/Surgeries/Residents/Research Studies
  is read once per request, doesn't need client-side state, and should
  be a Server Component that fetches and renders — no `useEffect`, no
  loading state, no client-side data-fetching library (no React Query,
  no SWR, no Redux/Zustand store for server data).
- A form (registering a Patient, recording a Control, editing a Research
  Study's text fields) is the legitimate case for a Client Component —
  it needs interactivity (validation feedback, disabled-while-submitting
  state) — but the actual submission should go through a **Server
  Action**, not a client-side `fetch` to `api`. The Client Component's
  job is the interactive shell around the input; the Server Action's job
  is the one and only place that talks to `api`.
- Anything that doesn't need a `useState`/`useEffect`/event handler
  should not have `"use client"` at the top of it. This is the concrete,
  checkable version of "as little React as possible."

## 5. Directory structure

Feature-based, mirroring the backend's own vertical slices rather than a
generic `components/`/`pages/`/`hooks/` split. Indicative shape (not
prescriptive down to the file — refine when Milestone 8 actually starts):

```
packages/web/
  src/
    app/
      (auth)/
        login/
        register/
      (dashboard)/
        patients/
          page.tsx                # Server Component: list
          [id]/page.tsx            # Server Component: detail
          new/page.tsx              # Client Component: form → Server Action
        procedure-types/
        surgeries/
          [id]/
            page.tsx                # detail, includes Control history
            controls/new/page.tsx    # record a Control
        residents/
        research-studies/
    features/
      patients/
        actions.ts                  # Server Actions calling api
        queries.ts                  # server-side reads from api
      surgeries/
      residents/
      research-studies/
    lib/
      api-client.ts                 # thin server-to-server HTTP client for `api`
      session.ts                    # reads the web-origin session cookie
```

Each `features/<slice>` directory owns its own Server Actions and reads,
matching one backend vertical (Patient, Surgery, Resident, Research
Study) one-to-one — the same "vertical slice" reasoning the backend
milestones already use, applied to the frontend.

## 6. What this document deliberately does not decide

- The exact `api-client.ts` shape (raw `fetch` wrapper vs. a generated
  client) — an implementation detail for whoever builds Milestone 8, not
  an architectural question.
- Component library / styling approach — out of scope for this document;
  affects usability, not architecture, and the product owner's own
  instruction was not to judge visual polish unless it affects MVP
  usability.
- Whether `api` gets a public CORS policy in addition to the private BFF
  path — open, tracked in ROADMAP.md's Planning Decisions.
- Testing tooling specifics (e.g. Playwright vs. another browser-test
  runner) for the human-E2E-adjacent Milestone 8 testing strategy — the
  Milestone entry names "scripted browser-level walkthrough" as the
  target, not a specific tool.

## 7. Boundaries this document does not change

Nothing here modifies `packages/domain`, `packages/application`,
`packages/infrastructure`, or `packages/http`. `api` remains the single
source of truth for business logic, persistence, and authorization —
`web`'s Server Actions are a transport layer to it, never a place to
re-implement or duplicate a rule that already lives in Domain or
Application. This mirrors the same discipline `application-layer-discovery.md`
established for the Application layer: orchestrate, don't reimplement.

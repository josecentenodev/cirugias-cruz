# 0014 — Frontend is Next.js (App Router), run as a Backend-For-Frontend

## Status

Established (post-Milestone-3 MVP replanning pass). Design recorded in
`docs/architecture/frontend-architecture-discovery.md` and
`docs/architecture/milestone-8-design.md`; implementation is Milestone 8
(`packages/web`), in progress. This ADR backfills the numbered-decision
record for a choice already approved and being built.

## Decision

The physician-facing frontend is **Next.js with the App Router**, in a
new workspace package `packages/web`, run as a **Backend-For-Frontend
(BFF)**:

- The browser only ever talks to `web`. `web`'s own Next.js server is the
  single client of `api` (`packages/http`), calling it server-to-server
  over Railway's private network — not a public, CORS-enabled API.
- **Server Components by default.** Client Components (`"use client"`)
  are the deliberate exception, reserved for forms and genuinely
  interactive leaf components.
- **Reads** happen in Server Components (SSR, no client-side fetch
  waterfall). **Writes** happen through Server Actions that call `api`.
- **No client-side state-management library** (React Query, Redux,
  Zustand, …) for data a Server Component can fetch directly.
- Directory structure is feature-based with App Router route groups, one
  per backend vertical slice (Patient / ProcedureType / Surgery /
  Resident / Research).
- Session propagation: `web` owns a `web_session` cookie that relays
  `api`'s own session id (reviewed in
  `docs/architecture/milestone-8-session-security-review.md` — approved,
  adds no exposure beyond `api`'s own session cookie).

## Rationale

- The product brief asks for "as little client-side React as possible."
  Server Components + Server Actions keep almost all logic on the server;
  the BFF pattern means the session cookie is same-origin between browser
  and `web` and never needs `SameSite=None`.
- Because the browser never talks to `api` directly, `api` needs no
  public domain and no CORS policy — it stays on Railway's private
  network. This is the topology the security baseline (Milestone 7) was
  designed around.
- A BFF keeps `api`'s private-network address (and its very existence)
  out of the browser bundle — `API_BASE_URL` is a server-only variable,
  never `NEXT_PUBLIC_`.

## Scope of this decision

Settles the **frontend framework, its hosting pattern (BFF), and its
rendering/data-flow posture**. Does not decide the visual design system
(kept minimal, usability-first) or any Platform Admin UI (Post-MVP).

## Not decided here

- Whether `api` ever needs a public CORS surface for a non-`web` client
  — tracked as an open Planning Decision in
  `docs/architecture/ROADMAP.md`.
- Deployment/runtime configuration of the `web` service on Railway
  (public domain, `PORT` handling, health check) — see
  [`../architecture/deployment-railway.md`](../architecture/deployment-railway.md)
  and Milestone 9.

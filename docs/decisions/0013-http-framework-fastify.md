# 0013 — HTTP framework is Fastify

## Status

Established (current iteration). Implemented in Milestone 3 (`packages/http`).
Records a choice that was made and built during that milestone but never
had its own ADR — this document backfills it so it carries the same
weight as the rest of the numbered decisions.

## Context

ADR [0012](0012-physician-identified-by-email.md) and the roadmap both
tracked "HTTP framework and authentication approach" as a single open
item. The authentication mechanism is settled separately (email +
password + PostgreSQL-backed server-side sessions — see ADR 0012 and the
Milestone 3 entry in `docs/architecture/ROADMAP.md`). This ADR settles
only the framework half.

## Decision

The HTTP layer (`packages/http`, the `api` service) uses **Fastify**.

- Routes are wired only to Application-layer operations; `packages/http`
  depends on `packages/application`, `packages/domain`, and
  `packages/infrastructure`, never the reverse.
- The acting physician's identity is resolved from the session cookie in
  a `requireAuth` preHandler — never from client-supplied input.
- Milestone 7 added Fastify's ecosystem plugins for the security
  baseline: `@fastify/helmet` (headers), `@fastify/rate-limit` (keyed by
  forwarded client IP), `@fastify/cookie`, JSON-schema request validation
  (structural only — no duplication of Domain rules), and Fastify's
  built-in Pino logger.

## Rationale

- The framework choice was constrained by an existing principle: it must
  not introduce dependencies into the domain. Fastify stays entirely
  inside `packages/http`; nothing about it leaks into Application or
  Domain.
- Fastify's first-party plugins (`helmet`, `rate-limit`, `cookie`) and
  built-in schema validation / Pino logging cover the entire Milestone 7
  security-and-operational baseline without pulling in a wider framework
  or a grab-bag of unrelated middleware.
- Server-side sessions (ADR 0012) need nothing more than a cookie plugin
  and a repository — no framework-specific auth machinery.

## Scope of this decision

Settles only **which HTTP framework `packages/http` uses**. Does not
reopen the authentication mechanism (ADR 0012), and does not decide
anything about the frontend's own HTTP surface — see ADR
[0014](0014-frontend-nextjs-app-router-bff.md).

## Not decided here

- Whether `api` is ever reachable by anything other than `web`'s server
  (a future mobile client, a public CORS policy). Leans private-only
  given the BFF pattern; tracked as an open Planning Decision in
  `docs/architecture/ROADMAP.md`.
- Deployment/runtime configuration of the `api` service on Railway — see
  [`../architecture/deployment-railway.md`](../architecture/deployment-railway.md).

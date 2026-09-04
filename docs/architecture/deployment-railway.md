# Deployment — Railway runbook

> Consolidated reference for **how this project is deployed and run on
> Railway**. It gathers knowledge that was previously scattered across a
> "Hosting platform" note in `ROADMAP.md` and the Railway dashboard. It
> does **not** decide anything about the domain or the application layer
> — see `docs/decisions/` for those.
>
> Scope of this document: the two application services (`api`, `web`),
> the `Postgres` service, and the non-obvious gotchas discovered while
> getting `api` to build and run. It is a reference, not a step-by-step
> "do the demo" guide.

---

## Topology

One GitHub repo (`cirugias-cruz`) → one Railway project (`cirugias-cruz`),
**shared monorepo** shape:

```
Railway project: cirugias-cruz
├── api        (packages/http, Fastify)      — private network only
├── web        (packages/web, Next.js BFF)   — the only public service
└── Postgres   (Railway-managed PostgreSQL)  — private network only
```

- The browser only talks to `web`. `web` talks to `api` over the private
  network. `api` talks to `Postgres` over the private network. Only `web`
  gets a public domain — see ADR
  [0014](../decisions/0014-frontend-nextjs-app-router-bff.md).
- `railway.api.json`/`railway.web.json` (repo root) remain the
  **documented reference** for each service's intended build/deploy
  commands. They are **not wired up as Railway's actual Config-as-code
  file** — see "Config-as-code is deprecated on this project" below;
  discovered while creating the `web` service (Milestone 8 closure).

---

## Config-as-code is deprecated on this project

Railway's public API now rejects `railwayConfigFile` (the field behind
the dashboard's "Config-as-code path" setting) with: _"Config as Code
(railway.json / railway.toml) is deprecated. Use Infrastructure as Code
(.railway/railway.ts) instead."_ This means `railway.api.json`/
`railway.web.json` are **not** read by Railway at build/deploy time on
this project, despite being named after the convention and despite
`api`'s own working deployment appearing to match them field-for-field.

What actually configures each service today: the same values, set
**directly on the service instance** (`buildCommand`, `startCommand`,
`watchPatterns`, `restartPolicyType`/`restartPolicyMaxRetries`, `builder`)
via `railway api` (the GraphQL `serviceInstanceUpdate` mutation) or the
dashboard's own "Settings" tab — not via a referenced file. `api`'s
working deployment was already configured this way; `web`'s was set up
identically when its service was created (Milestone 8 closure).

`railway.api.json`/`railway.web.json` are kept in the repo anyway as the
single source of truth for what those settings _should_ be — a person
(or agent) provisioning a fresh environment reads the file and applies
its values by hand (CLI or dashboard), rather than relying on Railway to
pick the file up automatically. If Railway's Infrastructure-as-Code
(`.railway/railway.ts`) is adopted later, that would be the place to
actually re-attach these files programmatically — tracked as an Open
item below, not decided here.

## Service settings

**Real Railway service names differ from this doc's role names** — the
`api` role is actually a service literally named `cirugias-cruz` (its
original name, predating this doc's `api`/`web` role vocabulary); `web`
is actually named `web`. This matters concretely: a reference variable
must name the real service (`${{cirugias-cruz.RAILWAY_PRIVATE_DOMAIN}}`,
not `${{api.RAILWAY_PRIVATE_DOMAIN}}` — the latter silently resolves to
an empty string, since no service is named `api`). Discovered while
setting `web`'s `API_BASE_URL` (Milestone 8 closure).

| Setting        | `api` (Railway name: `cirugias-cruz`)                                                           | `web`                               |
| -------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| Root Directory | **repo root** (`/`)                                                                             | **repo root** (`/`)                 |
| Build/start    | set directly on the service instance — see "Config-as-code is deprecated on this project" above | same                                |
| Builder        | Railpack                                                                                        | Railpack                            |
| Public domain  | none (private only)                                                                             | Railway domain (`*.up.railway.app`) |

### Why Root Directory is the repo root, not `packages/http` / `packages/web`

Setting `source.rootDirectory` to a subpackage **breaks Railpack's
pnpm-workspace detection**: it stops seeing the root `pnpm-workspace.yaml`
and falls back to plain `npm`, which cannot resolve the `workspace:*`
protocol the internal packages use. The working configuration keeps the
Root Directory at the repo root and uses explicit, `pnpm --filter`-scoped
build/start commands (in the `railway.*.json` files).

---

## `api` service

Configured in [`../../railway.api.json`](../../railway.api.json).

| Phase        | Command                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| Build        | `pnpm --filter @cirugias-cruz/infrastructure run prisma:generate`        |
| Pre-Deploy   | `pnpm --filter @cirugias-cruz/infrastructure exec prisma migrate deploy` |
| Start        | `pnpm --filter @cirugias-cruz/http run start`                            |
| Health check | `GET /health` (unauthenticated, added in Milestone 7)                    |

### Variables

| Variable            | Value                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | `${{Postgres.DATABASE_URL}}`                            | Reference variable to the `Postgres` service, private network. Never a hardcoded connection string.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `NODE_ENV`          | `production`                                            | Drives the `secure` flag on the session cookie (`packages/http/src/shared/session-cookie.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `PORT`              | `3000` (explicit)                                       | `packages/http/src/index.ts` reads `process.env.PORT` (falls back to `3000`) and listens on `0.0.0.0`. Set explicitly (rather than left to Railway's ambient injection) so `web` can reference it cross-service (`${{cirugias-cruz.PORT}}` — Railway only exposes a service's own variables for `${{service.VAR}}` reference resolution, not arbitrary ambient env vars another service happens to receive at runtime).                                                                                                                                                                                                                                                                                                                   |
| `LOG_LEVEL`         | optional                                                | Defaults to `info` (`build-app.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `RESEND_API_KEY`    | **not yet set**                                         | ADR [0015](../decisions/0015-physician-self-registration-email-confirmation.md)/[0016](../decisions/0016-physician-email-confirmation-paused-for-mvp.md). Read in `packages/http/src/index.ts`, passed to `ResendEmailSender`. Missing/empty is tolerated by design ("fail at use, not at boot" — see ADR 0015's Infrastructure notes): registration still succeeds, the confirmation email just silently fails to send (logged, not thrown). Since ADR 0016 paused the login-confirmation gate, this currently affects nothing MVP-required — Post-MVP, when confirmation is re-enabled, a real key (and a verified Resend sending domain — Resend's sandbox domain only delivers to the account owner's own address) becomes necessary. |
| `RESEND_FROM_EMAIL` | optional, defaults to `Epitaxy <onboarding@resend.dev>` | Same ADRs. The default is Resend's shared sandbox sender — fine for the owner's own test emails, not for real physicians once confirmation is re-enabled (needs a verified domain first).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `WEB_BASE_URL`      | **not yet set**, defaults to `http://localhost:3001`    | ADR 0015. The confirmation link embedded in the email points at `${WEB_BASE_URL}/confirm-email?token=...` — `web`'s own public origin, never `api` directly (BFF pattern, ADR 0014). The `localhost` default is wrong for production; must be set to `web`'s real public URL (currently `https://web-production-c686b1.up.railway.app`) before confirmation email is ever relied upon.                                                                                                                                                                                                                                                                                                                                                    |

### Migrations

Run via the **Pre-Deploy Command**, not the start command: Railway runs
it in its own container between build and deploy, with private-network
and env access, and **a failure blocks the rollout** so the previous
version keeps serving. This is the mechanism `README.md` and ADR 0013
already assume.

### Gotchas discovered while getting `api` to deploy

1. **`tsx` must be a runtime `dependency`, not a `devDependency`.**
   `packages/http`'s `start` script runs `tsx src/index.ts` directly
   against TypeScript source. Railpack prunes `devDependencies` from the
   final runtime image, so `tsx` in `devDependencies` produced a
   "command not found" at start. It now lives in `dependencies`.
2. **The `pnpm-lock.yaml` regeneration must be committed in the same
   change** as any dependency move like the one above. Railpack runs
   `pnpm install --frozen-lockfile`; a lockfile that doesn't match
   `package.json` fails the build. (This happened once mid-fix and is
   recorded so it isn't rediscovered.)

---

## `web` service

**Created and deployed — Milestone 8 closure** (`web-production-c686b1.up.railway.app`).
Configured directly on the service instance (see "Config-as-code is
deprecated on this project" above); [`../../railway.web.json`](../../railway.web.json)
remains the documented reference for what those settings should be.

| Phase        | Command                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| Build        | `pnpm --filter @cirugias-cruz/web run build`                                                  |
| Start        | `pnpm --filter @cirugias-cruz/web run start`                                                  |
| Health check | none yet — `web` exposes no health endpoint (candidate: add `/healthz`, or point at `/login`) |

### Watch patterns

`web` deliberately does **not** watch `packages/domain` / `application` /
`infrastructure`: it is a BFF that calls `api` over HTTP and imports no
workspace package. Its watch list is just `packages/web/**` plus the root
lockfile/workspace/config files.

### Variables (as actually configured)

| Variable       | Value                                                                      | Notes                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL` | `http://${{cirugias-cruz.RAILWAY_PRIVATE_DOMAIN}}:${{cirugias-cruz.PORT}}` | **Server-only.** Never `NEXT_PUBLIC_` — that would inline `api`'s private address into the browser bundle (`packages/web/next.config.ts` documents this). Read in `packages/web/src/lib/api-client.ts`. Note the real service name (`cirugias-cruz`, not `api`) — see "Service settings" above. Resolves to `http://cirugias-cruz.railway.internal:3000`. |
| `NODE_ENV`     | `production`                                                               | Drives the `secure` flag on `web`'s `web_session` cookie (`packages/web/src/lib/session.ts`) — verified set and effective (a fresh login over HTTPS round-tripped the cookie correctly; `document.cookie` reads empty in the browser, confirming `HttpOnly`).                                                                                             |

**Resolved**: `packages/web/package.json`'s `start` script was
`next start -p 3001`, which ignored Railway's injected `PORT`. Changed to
`next start` (Next.js honours `PORT` on its own) before the first `web`
deploy — the fix this doc had already flagged as required.

---

## Per-environment configuration

For a pre-production / staging environment, create a separate Railway
**environment** in the same project rather than a second project:

- Each environment has its own variables and should have its own
  `Postgres` instance (staging data must never share a database with
  production).
- Sealed/secret variables are **not** copied when an environment is
  duplicated — re-set them per environment on purpose.
- Reference variables (`${{Postgres.DATABASE_URL}}`,
  `${{api.RAILWAY_PRIVATE_DOMAIN}}`) resolve per environment
  automatically — prefer them over copy-pasting values.

---

## Open items (tracked in `ROADMAP.md`, not decided here)

- `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`WEB_BASE_URL` are not yet set on
  the live `api` service (see the Variables table above) — not
  MVP-blocking since ADR 0016 paused the login-confirmation gate that
  depended on them, but required before that gate is ever re-enabled.
  A Resident's temporary password needs none of this — the Physician
  reads it off `web`'s own UI and hands it off directly (ADR 0017), no
  email involved.
- Backup/recovery policy for the `Postgres` instance (Railway
  plan-tier-dependent).
- Whether `api` ever needs a public domain / CORS surface (leans
  private-only given the BFF pattern).
- CI/CD (no pipeline yet — deploys are triggered by pushes to `main`).
- `web` has a Railway-provided domain (`*.up.railway.app`); a custom
  domain and the human end-to-end walkthrough remain Milestone 9.
- `web`'s health check: none yet (`web` exposes no `/healthz`-style
  route). Not blocking — Railway falls back to container-health only —
  but worth adding before relying on Railway's own rollout gating.
- Re-attaching `railway.api.json`/`railway.web.json` as actual
  Infrastructure-as-Code (`.railway/railway.ts`) once that migration
  path is worth taking on — see "Config-as-code is deprecated on this
  project" above. Not urgent: the settings are already applied and
  documented, just not auto-synced from the file.

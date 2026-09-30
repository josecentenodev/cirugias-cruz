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
├── environment: production   (deploys from `main`)
│   ├── api  (Railway name: cirugias-cruz; packages/http, Fastify) — private network only
│   ├── web  (packages/web, Next.js BFF) — https://seguimientocirugias.com
│   └── Postgres                          — private network only
└── environment: staging      (deploys from `staging`)
    ├── api  (cirugias-cruz)              — private network only
    ├── web                               — https://staging.seguimientocirugias.com
    └── Postgres (its own, disposable)    — private network only
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

| Setting        | `api` (Railway name: `cirugias-cruz`)                                                           | `web`                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Root Directory | **repo root** (`/`)                                                                             | **repo root** (`/`)                                                                            |
| Build/start    | set directly on the service instance — see "Config-as-code is deprecated on this project" above | same                                                                                           |
| Builder        | Railpack                                                                                        | Railpack                                                                                       |
| Public domain  | none (private only)                                                                             | `https://seguimientocirugias.com` (custom domain; the Railway-generated URL may still resolve) |

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

| Variable            | Value                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`      | `${{Postgres.DATABASE_URL}}`                                 | Reference variable to the `Postgres` service, private network. Never a hardcoded connection string.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `NODE_ENV`          | `production`                                                 | Drives the `secure` flag on the session cookie (`packages/http/src/shared/session-cookie.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `PORT`              | `3000` (explicit)                                            | `packages/http/src/index.ts` reads `process.env.PORT` (falls back to `3000`) and listens on `0.0.0.0`. Set explicitly (rather than left to Railway's ambient injection) so `web` can reference it cross-service (`${{cirugias-cruz.PORT}}` — Railway only exposes a service's own variables for `${{service.VAR}}` reference resolution, not arbitrary ambient env vars another service happens to receive at runtime).                                                                                                                                                                                      |
| `LOG_LEVEL`         | optional                                                     | Defaults to `info` (`build-app.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `RESEND_API_KEY`    | **set** on the live `api` service                            | ADR [0015](../decisions/0015-physician-self-registration-email-confirmation.md)/[0016](../decisions/0016-physician-email-confirmation-paused-for-mvp.md)/[0028](../decisions/0028-physician-email-confirmation-reenabled.md). Read in `packages/http/src/index.ts`, passed to `ResendEmailSender`. "Fail at use, not at boot" (ADR 0015) still applies as resilience behavior for a future outage (send failure is logged, never thrown out of `registerPhysician`/`sendResidentInvitation`), but the happy path is now live: registration and resident-invitation emails actually deliver.                  |
| `RESEND_FROM_EMAIL` | `Seguimiento de Cirugías <no-reply@seguimientocirugias.com>` | Same ADRs. `seguimientocirugias.com` was purchased and its DNS (SPF/DKIM) added in Cloudflare and verified in Resend — Resend's shared sandbox domain (`onboarding@resend.dev`, which only delivered to the account owner's own address) is retired. **Must be set on the live `api` service** to an address at this verified domain — Resend verifies the domain, not an individual local part, so any address at it works; `no-reply@` is the conventional choice for a sender no one replies to. Used for both the physician confirmation email (0015/0028) and the resident invitation email (ADR 0029). |
| `WEB_BASE_URL`      | `https://seguimientocirugias.com`                            | ADR 0015/0028. The confirmation link embedded in the email points at `${WEB_BASE_URL}/confirm-email?token=...`, and the resident invitation link (ADR 0029) at `${WEB_BASE_URL}/accept-invitation?token=...` — `web`'s own public origin, never `api` directly (BFF pattern, ADR 0014). `web` is now served on this custom domain rather than the Railway-generated one (discovered while wiring this variable — see ROADMAP.md's "Public domain" section, superseded).                                                                                                                                      |

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
3. **Prisma client generation.** The `api` Build command above runs
   `prisma:generate` explicitly, but the root `package.json` also has a
   `postinstall` that runs it (guarded with `|| true` so a prod install
   without the `prisma` devDependency doesn't fail), and
   `@cirugias-cruz/infrastructure`'s `typecheck` / `test` scripts prepend
   `prisma generate`. This keeps a fresh clone, a branch switch, or a
   `git pull` touching `schema.prisma` from leaving a stale generated
   client and breaking `pnpm check` — the explicit Build command is now a
   safety net, not the only mechanism.

---

## `web` service

**Created and deployed — Milestone 8 closure**; now served on the
custom domain `https://seguimientocirugias.com` (the original
`web-production-c686b1.up.railway.app` may still resolve).
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

## Environments: production and staging

Both live in this one Railway project as separate **environments**, each
with its own variables and its own `Postgres` (staging never shares a
database with production):

| Environment  | Branch    | Public URL                              | Data                                   |
| ------------ | --------- | --------------------------------------- | -------------------------------------- |
| `production` | `main`    | https://seguimientocirugias.com         | real                                   |
| `staging`    | `staging` | https://staging.seguimientocirugias.com | disposable, never a copy of production |

Release flow: merge to `staging` → verify on the staging URL → merge
`staging` into `main`. Both services in each environment auto-deploy on
push to their branch (Settings → Source).

- Reference variables (`${{Postgres.DATABASE_URL}}`,
  `${{cirugias-cruz.RAILWAY_PRIVATE_DOMAIN}}`) resolve **inside the
  environment** they are read in — that is what keeps staging's `api`
  on staging's Postgres. Prefer them over copied values.
- Staging overrides only `WEB_BASE_URL=https://staging.seguimientocirugias.com`
  (so email links point at staging). It shares production's `RESEND_*`
  values, so staging email is real — accepted by the product owner
  (ROADMAP § Risks and Unknowns).
- Custom domains: Railway gives a CNAME target plus a TXT verification
  record, both in Cloudflare's DNS for `seguimientocirugias.com` (staging's
  were added through Railway's one-click Cloudflare connection). With
  Cloudflare's proxy on, SSL/TLS mode must be **Full**, not Full (Strict)
  (`oficial` — docs.railway.com/networking/domains/working-with-domains).
  `web` listens on port 8080 in both environments.
- Gotcha: duplicating an environment in the dashboard **deploys
  immediately** — nothing waits for review. Check the duplicated
  variables right away.

---

## Test database

The DB-backed suites (`packages/infrastructure`, `packages/http`) run
only against `DATABASE_URL_TEST` — enforced by
[`scripts/test-database.mjs`](../../scripts/test-database.mjs), wired
through each package's `vitest.config.mjs`. There is no fallback to
`DATABASE_URL`; a missing, remote (without `TEST_DATABASE_ALLOW_REMOTE=1`)
or `DATABASE_URL`-equal URL aborts the run before any connection. The
global setup runs `prisma migrate deploy` against it first.

Local databases (PostgreSQL on the developer machine, one-time setup):

1. As a Postgres superuser, create a disposable role and two databases:
   `CREATE ROLE cirugias_test LOGIN PASSWORD '…';`
   `CREATE DATABASE cirugias_test OWNER cirugias_test;`
   `CREATE DATABASE cirugias_dev OWNER cirugias_test;`
2. In both `packages/infrastructure/.env` and `packages/http/.env`
   (gitignored; see each `.env.example`): `DATABASE_URL` → `cirugias_dev`
   (what a locally run `api` uses), `DATABASE_URL_TEST` → `cirugias_test`.
   Never point either at production.
3. Migrate the dev database once:
   `DATABASE_URL=… pnpm --filter @cirugias-cruz/infrastructure exec prisma migrate deploy`.
   The test database migrates itself on the first `pnpm run test`.

## End-to-end suite (Playwright)

`packages/web/e2e/full-workflow.spec.ts` drives the whole physician
workflow in a real browser against a real local stack:

1. Start `api` (port 3000) and `web` (port 3001) — the `api` and `web`
   entries in `.claude/launch.json`, or `pnpm --filter @cirugias-cruz/http
run start` and `pnpm --filter @cirugias-cruz/web run dev`. `api` uses
   the local `DATABASE_URL` (the dev database).
2. `pnpm --filter @cirugias-cruz/web e2e`.

The global setup registers a fresh physician through `api`, confirms its
email directly in the database (`packages/infrastructure/e2e-confirm.ts`
— there is no inbox) and deletes the whole tenant afterwards
(`e2e-cleanup.ts`). No Resend key is configured locally, so no email is
sent (send failures are logged, never thrown — ADR 0015).

---

## Open items (tracked in `ROADMAP.md`, not decided here)

- CI/CD: no pipeline — Railway auto-deploys `main` and `staging` without
  running the quality gate (ROADMAP Planning Decision 2).
- Backup/recovery policy for the production `Postgres` (Railway
  plan-tier-dependent; Planning Decision 3).
- Whether `api` ever needs a public domain / CORS surface (leans
  private-only given the BFF pattern; Planning Decision 1).
- `web`'s health check: none yet (`web` exposes no `/healthz`-style
  route). Not blocking — Railway falls back to container health — but
  worth adding before relying on Railway's own rollout gating.
- Re-attaching `railway.api.json`/`railway.web.json` as Infrastructure-as-Code
  (`.railway/railway.ts`) once worth it — see "Config-as-code is
  deprecated on this project" above.

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
├── web        (packages/web, Next.js BFF)   — the only public service   [not created yet]
└── Postgres   (Railway-managed PostgreSQL)  — private network only
```

- The browser only talks to `web`. `web` talks to `api` over the private
  network. `api` talks to `Postgres` over the private network. Only `web`
  gets a public domain — see ADR
  [0014](../decisions/0014-frontend-nextjs-app-router-bff.md).
- Config-as-code lives in the repo: `railway.api.json`, `railway.web.json`
  (repo root). Each service's **Config-as-code path** setting must point
  at its file (a single `railway.json` cannot serve both, since both
  services build from the repo root).

---

## Service settings (dashboard — not expressible in `railway.*.json`)

| Setting             | `api`               | `web`                               |
| ------------------- | ------------------- | ----------------------------------- |
| Root Directory      | **repo root** (`/`) | **repo root** (`/`)                 |
| Config-as-code path | `railway.api.json`  | `railway.web.json`                  |
| Builder             | Railpack            | Railpack                            |
| Public domain       | none (private only) | Railway domain and/or custom domain |

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

| Variable       | Value                        | Notes                                                                                                  |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Reference variable to the `Postgres` service, private network. Never a hardcoded connection string.    |
| `NODE_ENV`     | `production`                 | Drives the `secure` flag on the session cookie (`packages/http/src/shared/session-cookie.ts`).         |
| `PORT`         | injected by Railway          | `packages/http/src/index.ts` reads `process.env.PORT` (falls back to `3000`) and listens on `0.0.0.0`. |
| `LOG_LEVEL`    | optional                     | Defaults to `info` (`build-app.ts`).                                                                   |

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

## `web` service (not created yet — Milestone 8/9)

Configured in [`../../railway.web.json`](../../railway.web.json).

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

### Variables (intended)

| Variable       | Value                                                  | Notes                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_BASE_URL` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` | **Server-only.** Never `NEXT_PUBLIC_` — that would inline `api`'s private address into the browser bundle (`packages/web/next.config.ts` documents this). Read in `packages/web/src/lib/api-client.ts`.           |
| `NODE_ENV`     | `production`                                           | Drives the `secure` flag on `web`'s `web_session` cookie (`packages/web/src/lib/session.ts`). A deployment-checklist item per `milestone-8-session-security-review.md` — verify it is actually set, don't assume. |
| `PORT`         | injected by Railway                                    | **Known issue:** `packages/web/package.json`'s `start` script is `next start -p 3001`, which ignores Railway's `PORT`. Change to `next start` (Next.js honours `PORT`) before the first `web` deploy.             |

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

- Backup/recovery policy for the `Postgres` instance (Railway
  plan-tier-dependent).
- Whether `api` ever needs a public domain / CORS surface (leans
  private-only given the BFF pattern).
- CI/CD (no pipeline yet — deploys are triggered by pushes to `main`).
- `web`'s public domain and the human end-to-end walkthrough — Milestone 9.

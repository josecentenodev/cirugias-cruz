/**
 * Which database the DB-backed test suites (packages/infrastructure,
 * packages/http) may touch — and the guard that keeps them off
 * production. Until 2026-09-29 those suites read `DATABASE_URL` from the
 * package `.env`, which pointed at the production Postgres, so every
 * `pnpm run test` created and deleted rows in real clinical data
 * (docs/architecture/ROADMAP.md § Risks and Unknowns).
 *
 * Rules:
 * - Tests only ever use `DATABASE_URL_TEST`. There is no fallback to
 *   `DATABASE_URL` — a missing test URL fails the run loudly.
 * - It must point at this machine (localhost / 127.0.0.1 / ::1), unless
 *   `TEST_DATABASE_ALLOW_REMOTE=1` opts into a dedicated remote test DB.
 * - It may never equal `DATABASE_URL`, opt-in or not.
 *
 * Setup: docs/architecture/deployment-railway.md § Test database.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** @param {Record<string, string | undefined>} env */
export function resolveTestDatabaseUrl(env) {
  const raw = env.DATABASE_URL_TEST;
  if (!raw) {
    throw new Error(
      "DATABASE_URL_TEST is not set. DB-backed tests never fall back to DATABASE_URL " +
        "(it may be production). See docs/architecture/deployment-railway.md § Test database.",
    );
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL_TEST is not a valid postgres URL.");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL_TEST is not a valid postgres URL.");
  }

  if (env.DATABASE_URL && sameDatabase(raw, env.DATABASE_URL)) {
    throw new Error("DATABASE_URL_TEST points at the same database as DATABASE_URL — refusing.");
  }

  if (!LOCAL_HOSTS.has(url.hostname) && env.TEST_DATABASE_ALLOW_REMOTE !== "1") {
    throw new Error(
      `DATABASE_URL_TEST host "${url.hostname}" is not a local database. ` +
        "Set TEST_DATABASE_ALLOW_REMOTE=1 only for a dedicated, disposable test database.",
    );
  }
  return raw;
}

function sameDatabase(a, b) {
  try {
    const x = new URL(a);
    const y = new URL(b);
    return x.hostname === y.hostname && x.port === y.port && x.pathname === y.pathname;
  } catch {
    return a === b;
  }
}

/**
 * The package's `.env` merged under the real environment (real env wins,
 * like dotenv). Read with node's own parser — no dependency.
 */
export function loadPackageEnv(packageDir) {
  const file = path.join(packageDir, ".env");
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  return { ...fromFile, ...process.env };
}

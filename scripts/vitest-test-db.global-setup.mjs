/**
 * Vitest `globalSetup` for the DB-backed suites: brings the guarded test
 * database to the repo's current schema (`prisma migrate deploy`, the same
 * command production's Pre-Deploy runs) once, before any test worker
 * starts. Idempotent — a database already up to date is a no-op.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPackageEnv, resolveTestDatabaseUrl } from "./test-database.mjs";

const infrastructureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/infrastructure",
);

export default function setup() {
  const url = resolveTestDatabaseUrl(loadPackageEnv(process.cwd()));
  execSync("pnpm exec prisma migrate deploy", {
    cwd: infrastructureDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: ["ignore", "ignore", "inherit"],
  });
}

/**
 * Vitest `setupFiles` entry for the DB-backed suites. Runs in every test
 * worker BEFORE any test module (and so before any `PrismaClient` or
 * `import "dotenv/config"`) — it points `DATABASE_URL` at the guarded
 * test database, so the production URL in the package `.env` is never
 * what Prisma sees. dotenv never overrides an already-set variable.
 */
import { loadPackageEnv, resolveTestDatabaseUrl } from "./test-database.mjs";

process.env.DATABASE_URL = resolveTestDatabaseUrl(loadPackageEnv(process.cwd()));

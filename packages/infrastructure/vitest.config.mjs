import { defineConfig } from "vitest/config";

/**
 * DB-backed suite: every run is pointed at the guarded test database
 * (`DATABASE_URL_TEST`, local by default) and migrated first — never the
 * `DATABASE_URL` in `.env`, which may be production. See
 * scripts/test-database.mjs and docs/architecture/deployment-railway.md
 * § Test database.
 */
export default defineConfig({
  test: {
    globalSetup: ["../../scripts/vitest-test-db.global-setup.mjs"],
    setupFiles: ["../../scripts/vitest-test-db.setup.mjs"],
  },
});

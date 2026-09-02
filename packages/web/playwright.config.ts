import { defineConfig, devices } from "@playwright/test";

/**
 * Milestone 8's own Measurable completion criteria: "a scripted (e.g.
 * Playwright) browser-level walkthrough of the full workflow passes
 * against a real deployment." This targets a real, running `web` +
 * `api` + Postgres stack — never mocked — via two env vars:
 *
 * - PLAYWRIGHT_BASE_URL: the `web` origin to drive the browser against.
 *   Defaults to a locally-running production build (`next start`, see
 *   package.json's `start` script) on port 3001.
 * - PLAYWRIGHT_API_BASE_URL: used only by `e2e/test-physician.ts` to register a
 *   fresh, unique test physician directly against `api` before the
 *   browser-driven part of the walkthrough begins — there is no
 *   self-registration UI (`web`'s own documented Scope; see
 *   docs/architecture/ROADMAP.md's Capability Map). This must be an
 *   address the *test runner's own machine* can reach — `api` has no
 *   public domain by design (private-network-only, ADR 0014), so this
 *   only works against a locally-reachable `api` (or one you've
 *   otherwise exposed for this purpose), never `api`'s Railway private
 *   domain directly.
 *
 * This suite is not a substitute for the manual private-networking
 * verification already performed against the real Railway deployment
 * (see docs/architecture/ROADMAP.md's Milestone 8 entry) — that proves
 * `web`(public, Railway) -> `api`(private network) -> Postgres.  This
 * suite proves the *scripted, reproducible UI walkthrough* itself,
 * which is what Milestone 8's own DoD asks for.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  // Real Postgres round-trips through Server Actions have been observed
  // taking several seconds each during manual verification, and this is
  // one long, continuous walkthrough (not many small tests) — generous
  // timeouts here reflect that reality, not test flakiness.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

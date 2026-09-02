import { exec } from "node:child_process";
import { promisify } from "node:util";
import { registerTestPhysician } from "./test-physician.js";

const execAsync = promisify(exec);

/**
 * Registers one fresh test physician before the suite runs (see
 * test-physician.ts) and exposes its credentials to the spec via
 * `process.env` — set here, in the main process, before Playwright forks
 * worker processes, so every worker inherits them.
 *
 * The function this returns is Playwright's documented global-teardown
 * mechanism (see playwright.config.ts's own comment on why `web` cannot
 * self-clean via its own UI: nothing in its Scope deletes a physician).
 * Cleanup runs as a **child process** in `packages/infrastructure`
 * (`e2e-cleanup.ts`) rather than `packages/web` importing
 * `@cirugias-cruz/infrastructure`/Prisma directly — `web` (this file
 * included) keeps the documented invariant of importing no workspace
 * package (see `deployment-railway.md`'s "Watch patterns" section);
 * `packages/web/package.json` has no workspace-package dependency as a
 * result.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const physician = await registerTestPhysician();

  process.env.PLAYWRIGHT_TEST_EMAIL = physician.email;
  process.env.PLAYWRIGHT_TEST_PASSWORD = physician.password;

  return async function globalTeardown(): Promise<void> {
    // `packages/infrastructure` has no `tsx` of its own (only a runtime
    // `dependency` in `packages/http` — see deployment-railway.md's `api`
    // gotcha #1); `--filter @cirugias-cruz/http exec tsx` runs the
    // infrastructure script with an interpreter that's actually present,
    // the same invocation this project's own manual cleanup scripts have
    // always used.
    //
    // `child_process.exec` (a shell command *string*), not `execFile`
    // with `shell: true` (an args *array*) — pnpm's Windows entrypoint is
    // a `.cmd` shim, which only `CreateProcess` via a real shell can run
    // (`execFile` without a shell fails with `spawn EINVAL` on Windows
    // regardless of the `.cmd` extension); `exec`'s single-string form is
    // Node's own documented way to do that without triggering the
    // args-array escaping deprecation warning (DEP0190). The physician
    // id is machine-generated (`crypto.randomUUID()`, never user input),
    // so interpolating it directly carries no injection risk.
    await execAsync(
      `pnpm --filter @cirugias-cruz/http exec tsx ../infrastructure/e2e-cleanup.ts ${physician.physicianId}`,
    );
  };
}

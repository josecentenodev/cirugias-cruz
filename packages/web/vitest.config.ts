import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Only needed here (unlike the other packages) to resolve the `@/*` path
 * alias `tsconfig.json` declares for Next.js's bundler — `vitest run`
 * doesn't read `tsconfig.json`'s `paths` on its own.
 */
export default defineConfig({
  // Scoped to src/ only — vitest's own default include pattern
  // (`**/*.{test,spec}.ts`) would otherwise also pick up
  // `e2e/*.spec.ts`, which uses `@playwright/test`'s own `test`/`expect`
  // (a different test runner entirely, run via `pnpm e2e`, not `pnpm test`).
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

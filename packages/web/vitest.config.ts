import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Only needed here (unlike the other packages) to resolve the `@/*` path
 * alias `tsconfig.json` declares for Next.js's bundler — `vitest run`
 * doesn't read `tsconfig.json`'s `paths` on its own.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

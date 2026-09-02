// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      ".claude/worktrees/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        // `e2e-cleanup.ts` sits outside `packages/infrastructure`'s own
        // `rootDir: "src"` (it's a standalone script, not library
        // source — see `tsconfig.scripts.json`), so it can't be added to
        // that package's main tsconfig `include` without breaking its
        // build. `allowDefaultProject` lets the project service lint it
        // against an inferred, single-file program instead.
        projectService: { allowDefaultProject: ["packages/infrastructure/e2e-cleanup.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // A leading underscore is this codebase's existing convention for
      // an intentionally-unused parameter (e.g. a Server Action's
      // `_previousState`, required by `useActionState`'s call signature
      // but not read) — this makes that convention actually enforced/
      // exempted consistently, rather than only by positional accident.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // packages/web only: React Hooks correctness rules (exhaustive-deps,
    // rules-of-hooks) for its Client Components — the only place hooks
    // exist in this workspace.
    files: ["packages/web/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  eslintConfigPrettier,
);

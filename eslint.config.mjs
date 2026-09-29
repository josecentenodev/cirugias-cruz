// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

const NO_USE_ACTION_STATE = {
  name: "react",
  importNames: ["useActionState"],
  message:
    "Use <ActionForm> or useFormAction (components/ActionForm.tsx) — form feedback is centralized there.",
};
const NO_API_ERROR_CLASSES = {
  name: "@/lib/api-errors",
  importNames: [
    "ApiAuthError",
    "ApiDomainError",
    "ApiNotFoundError",
    "ApiRateLimitedError",
    "ApiUnexpectedError",
  ],
  message:
    "Server Actions don't handle API errors themselves — runFormAction (lib/form-action.ts) does.",
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/node_modules/**",
      ".claude/worktrees/**",
      // chasis-kit: vendored generic gates — quality guaranteed by their own
      // spec, not this repo's lint style (chasis-kit README §7).
      "scripts/chasis-check.mjs",
      "scripts/chasis-check.spec.mjs",
      "scripts/contexto-check.mjs",
      "scripts/contexto-check.spec.mjs",
      "scripts/docs-linkcheck.mjs",
      "scripts/docs-linkcheck.spec.mjs",
      "scripts/docs-ratchet.mjs",
      "scripts/docs-ratchet.spec.mjs",
    ],
  },
  js.configs.recommended,
  {
    // Plain-Node ESM scripts (the test-database guard and its Vitest
    // setup files) — no `globals` package in this workspace, so the few
    // Node globals they use are declared here.
    files: ["scripts/**/*.mjs", "packages/*/vitest.config.mjs"],
    languageOptions: {
      globals: { process: "readonly", URL: "readonly", console: "readonly" },
    },
  },
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
  {
    // Milestone 12 (docs/architecture/milestone-12-form-feedback-design.md):
    // form feedback is centralized. A form never reads an action's result
    // itself — `useActionState` lives only inside `components/ActionForm.tsx`
    // (useFormAction).
    files: ["packages/web/src/**/*.ts", "packages/web/src/**/*.tsx"],
    ignores: ["packages/web/src/components/ActionForm.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [NO_USE_ACTION_STATE] }],
    },
  },
  {
    // ...and a Server Action never classifies an `api` error itself —
    // `lib/form-action.ts` (runFormAction) maps them centrally. Declared
    // AFTER the block above and repeating its path: in flat config the
    // later `no-restricted-imports` replaces the earlier one for a file.
    files: ["packages/web/src/features/**/actions.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "BinaryExpression[operator='instanceof'][right.name=/^Api[A-Za-z]*Error$/]",
          message:
            "Don't classify API errors in a Server Action — call runFormAction (lib/form-action.ts), which maps them centrally.",
        },
      ],
      "no-restricted-imports": ["error", { paths: [NO_USE_ACTION_STATE, NO_API_ERROR_CLASSES] }],
    },
  },
  eslintConfigPrettier,
);

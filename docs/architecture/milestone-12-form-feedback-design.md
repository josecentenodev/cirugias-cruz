# Milestone 12 — Centralized form feedback (success + error) — design

> Status: **approved 2026-09-29** by the product owner (all three
> recommended options in §6 accepted). **Completed**: implemented
> 2026-09-29, deployed, and covered by the Playwright `full-workflow`
> suite (green 2026-09-30). What changed against this plan is §9.
> Tracked in [`ROADMAP.md`](ROADMAP.md) § Milestone 12.

## 0. Completion criteria

- No file under `packages/web/src/features/**` contains
  `instanceof Api*Error`, a `*FormState` type, or its own
  `useActionState` — enforced by an ESLint `no-restricted-syntax` rule,
  not by convention.
- Every Server Action is built with `formAction(...)`
  (`lib/form-action.ts`) and returns the single `ActionResult` shape.
- Every mutation shows visible feedback: an inline error `Alert` on
  failure (form values preserved), a toast on success — including
  successes that end in a `redirect`.
- An `ApiUnexpectedError` (500 / network) inside a form no longer
  replaces the page with `app/error.tsx`; it shows a generic inline
  message and is logged server-side.
- Zod validation failures render per-field messages (`aria-invalid` +
  text under the input) in addition to the form-level message.
- Full gate green (`pnpm run check`) + Playwright `full-workflow`
  asserts one success toast and one inline domain error.

## 1. Current state (as of 2026-09-29) — why this exists

Centralized already, and **unchanged** by this milestone:
`lib/api-client.ts` (sole `fetch`), `lib/api-errors.ts` (status → typed
error), `lib/authed-api-request.ts` (401 → `/login` redirect).

Hand-copied per mutation: 31 Server Actions in 7 `features/*/actions.ts`
each declare their own `XFormState { error?; ...ad-hoc flags }` (`sent`,
`succeededActive`, `values`, `token`) and repeat the same
`catch → instanceof ApiDomainError|ApiNotFoundError → return { error }`;
~23 client components each render `{state.error ? <Alert/> : null}`.

Gaps this produces: a `redirect`-on-success mutation (the majority)
gives **no** success signal; `ApiRateLimitedError` is caught almost
nowhere; `ApiUnexpectedError` is re-thrown and replaces the whole page
with `error.tsx`, wiping the form.

This is also drift from [`milestone-8-design.md`](milestone-8-design.md)
§7, which specified one uniform action result and an inline generic
message for unexpected action failures — never implemented. This
milestone implements §7 rather than superseding it.

## 2. The contract — `lib/action-result.ts`

```ts
export type ActionResult =
  | { status: "idle" }
  | { status: "success"; message?: string; id: number }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      values?: Record<string, string>;
      id: number;
    };
```

`id` changes on every submission so two identical consecutive results
still fire their feedback once each. Replaces every `*FormState`.

## 3. Server — `lib/form-action.ts` (the only mutation `try/catch`)

```ts
export function formAction<Input, Out>(config: {
  schema?: ZodType<Input>;
  sensitiveFields?: string[]; // default also excludes /password/i
  run: (input: Input, formData: FormData) => Promise<Out>;
  success?: { message?: MessageKey; redirectTo?: string | ((out: Out) => string) };
}): (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
```

Behavior, in order:

1. `schema` fails → `error` with Zod's per-field messages as
   `fieldErrors` + a form-level message.
2. `run` throws:
   - Next control-flow signals (`redirect`, `notFound`, including the
     401 redirect from `authedApiRequest`) → re-thrown via
     `unstable_rethrow` from `next/navigation` (present in Next 16.3.4 —
     `empírico`, `node_modules/next/dist/client/components/navigation.d.ts`).
   - `ApiDomainError` / `ApiNotFoundError` → `error`, message verbatim
     (§7 of milestone-8-design: never reworded).
   - `ApiRateLimitedError` → `error`, copy from `messages/en.ts`.
   - anything else → logged server-side **without clinical data**,
     `error` with the generic copy from `messages/en.ts`.
3. Every `error` echoes submitted string fields except sensitive ones
   (replaces `lib/form-values.ts`'s `valuesFromFormData`).
4. Success with `redirectTo` → set the flash (§4), then `redirect`.
   Success without → `success` (callers keep their `revalidatePath` in
   `run`).

A migrated action has no `catch` of its own:

```ts
export const registerPatientAction = formAction({
  schema: registerPatientSchema,
  run: (input) =>
    authedApiRequest<RegisterPatientResponse>({ method: "POST", path: "/patients", body: input }),
  success: { message: "patients.registered", redirectTo: (r) => `/patients/${r.patientId}` },
});
```

Actions bound with extra arguments (`.bind(null, surgeryId, …)`) keep
that pattern: `formAction` returns a function the caller binds from the
outside, or `run` receives the bound values through a thin factory —
decided in Phase 0 against the real `surgeries`/`research-studies`
signatures, not assumed here.

## 4. Visual feedback

- **Errors → inline**, top of the form (`<FormFeedback>`: `Alert`,
  `role="alert"`, receives focus) plus per-field text via `<FormField>`.
  Persistent, next to what needs fixing (ux-principles §4 Forgiving).
- **Success → toast**, `@base-ui/react/toast` (already a dependency;
  present in `node_modules` — `empírico`). One `<Toaster/>` in
  `app/layout.tsx`, `success`/`danger` tokens from
  [`design-system.md`](../design/design-system.md), `aria-live="polite"`.
- **Success across a redirect → one-shot flash cookie.** The action
  stores a **message key** (never free text, never clinical data); the
  `<Toaster>` reads it on route change (`usePathname`), deletes it, shows
  the toast. `hipótesis` — TODO: validar that a cookie set inside a
  Server Action before `redirect()` is readable client-side on the
  destination route in Next 16 App Router (Phase 0 spike; row in
  ROADMAP § Risks and Unknowns). Fallback if it fails: a `?flash=<key>`
  query param stripped with `router.replace`.

## 5. Client — `components/ActionForm.tsx`

`<ActionForm action={…}>` owns `useActionState`, renders
`<FormFeedback>`, provides `values`/`fieldErrors` through context to
`<FormField name=…>` (`defaultValue` + `aria-invalid` + message), and
fires the toast on a non-redirect `success`. `ConfirmSubmit` and
`DangerousConfirm` are rebuilt on it (same public props). Feature
components stop reading action state entirely.

## 6. Decisions (product owner, 2026-09-29)

1. Unexpected errors inside a form → **generic inline message, form
   preserved** (implements milestone-8-design §7), not `error.tsx`.
   Page-level (Server Component) failures still go to `error.tsx`.
2. Redirect-on-success → **toast via flash cookie**.
3. **Field-level Zod errors are in scope.** This reverses the earlier
   deferral recorded in `design-system.md` ("deferred by product
   decision") and ROADMAP § Milestone 10 — an explicit scope change, per
   ROADMAP maintenance rule 8.

## 7. Phases (each ends with `pnpm run check` green)

| Phase                | Work                                                                                                                                                                                               | Tests                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 · Infrastructure   | `action-result.ts`, `form-action.ts`, `ActionForm`/`FormField`/`FormFeedback`, `Toaster`, flash; flash spike on one real redirect; bound-args shape decided                                        | `form-action.test.ts`: each error class; redirect/notFound re-thrown not swallowed; unexpected → generic + logged; password never echoed; `fieldErrors`; `id` changes per call |
| 1 · Reference slice  | Migrate `patients` end to end                                                                                                                                                                      | Rewrite `patients/actions.test.ts` to the new contract; no spec left green on the old shape                                                                                    |
| 2 · Remaining slices | `procedure-types`, `research-studies`, `surgeries`, `residents`, `resident-session`, `auth` (login + accept-invitation are the edge cases: raw-response login, `token` echo). One slice per commit | Each slice's `actions.test.ts` rewritten                                                                                                                                       |
| 3 · Closure          | Delete `*FormState` types, `valuesFromFormData`, leftover catches; enable the ESLint guard; Playwright assertions                                                                                  | Lint (guard live), full suite, `full-workflow` e2e                                                                                                                             |
| Docs                 | Note in milestone-8-design §7 that it is now implemented; `ux-principles.md` §2 criteria; `design-system.md` components + remove the field-level deferral; ROADMAP status                          | `docs-linkcheck`                                                                                                                                                               |

Fail paths the tests must cover: double submit (`PendingButton`);
identical success twice → two toasts; back navigation does not replay a
toast (flash is one-shot); session expiry mid-action still redirects to
`/login`; two forms on one row (`ResidentCredentialActions`) keep
isolated state; JS disabled → inline error `Alert` still server-rendered
(toast requires JS — accepted).

## 8. Out of scope / unchanged

`api-client`, `api-errors`, `authedApiRequest`; the verbatim-domain-
message rule; Server Components by default; no new dependency; no
domain, Application or `api` change; page-level `error.tsx` /
`not-found.tsx` behavior for Server Component failures.

## 9. As built — deviations and findings (2026-09-29)

- **Action shape (the §3 open question).** Each Server Action stays a
  plain `export async function` that returns `runFormAction(formData,
{…})`, rather than `export const x = formAction({…})`. Bound ids keep
  the standard `.bind(null, …)`. Reason: a `"use server"` file must export
  async functions, and a higher-order export leans on how Next validates
  that at runtime — not worth depending on for zero gain.
- **`runFormAction` is one signature over a config union, not overloads.**
  With overloads, TS fixed a contextually-typed `success: (out) => …`
  parameter against the first candidate and `out` became `unknown`.
  `success` takes `NoInfer<Out>` so `Out` comes from `run` alone.
- **Additions not in the plan:** `FormError` (a thrown error whose message
  is user copy — login's fail-closed cookie parse); `invalidMessage` may be
  a function of the field errors (accept-invitation's hidden token);
  `toApiError` takes a 400 fallback (login's "Invalid email or password.");
  `ActionForm` gained `feedbackClassName` (row layouts) and `afterForm`
  (login's resend prompt, which used to be a `<form>` nested inside the
  login `<form>` — invalid HTML, now a sibling); `FormTextarea` /
  `FormSelect` beside `FormField`; `CustomFieldValueInputs` bound via
  `useField` so CustomField values are restored too.
- **Flash reader has four triggers**, not one (`empírico`, browser spike):
  route change, a form settling (pending → idle), a form (re)mounting, and
  a form that submitted unmounting. A redirect back to the same URL doesn't
  change the pathname, and the redirect re-creates the form, so the settle
  edge alone never fired.
  - _Fourth trigger added 2026-09-30 (manual testing)_: a row's own remove
    button (`DangerousConfirm` inside the row it deletes — control types,
    custom fields, surgery residents, study surgeries) disappears with the
    row before it settles, so none of the first three fired: no toast,
    and the flash surfaced later as a stray toast on an unrelated page.
    Reading the flash synchronously in the unmount cleanup works — the
    cookie is already set when the row unmounts (`empírico`, e2e red →
    fix → green, mutation-checked). Covered by `full-workflow`
    (`expectFlashConsumed`). If yet another gap appears, prefer replacing
    the event-driven reader (e.g. the server rendering the flash key into
    the layout) over adding a fifth trigger.
- **Phase 2 landed as one commit**, not one per slice: `ConfirmSubmit` /
  `DangerousConfirm` change type for every slice that uses them at once.
- **ESLint guard ordering** (mutation-tested): in flat config a later
  `no-restricted-imports` replaces an earlier one for the same file, so
  the `actions.ts` block comes last and repeats the `useActionState` path.
- **Behavior changes worth knowing:** resending a resident invitation now
  revalidates the list (the row's pending/accepted text refreshes); the
  resend-confirmation prompt stays visible after sending (the toast is the
  confirmation); login fields are marked `aria-invalid` only for a
  field-level error, not for a wrong-credentials rejection.
- **Out of scope, still per-call:** `features/*/queries.ts` catch
  `ApiNotFoundError` → `notFound()` for Server Component reads (§8), and
  `logoutAction` keeps its own log-and-continue (logout must always
  succeed; it is not a form with feedback).

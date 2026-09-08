# UX Principles — Seguimiento de Cirugías

The product owner adopted a 7-point UI checklist as the standard every screen is
held to. Each point is backed by one or more [Laws of UX](https://lawsofux.com/)
(`lawsofux.com`, in the owner's knowledge base under
`Programación/UX UI Resources.md`). This document is the acceptance checklist for
the Milestone 10 per-screen audit and for any new UI thereafter.

Companion: [design-system.md](./design-system.md) (tokens, components).
Condensed, always-on version for implementation work: the `ux-laws` skill.

---

## 1. Clear and concise

Users should always understand the purpose of a screen, how to use it, and how to
reach their goal. Only the necessary elements — no information overload.

**Backing laws:** Hick's Law, Miller's Law, Occam's Razor, Tesler's Law, Law of Prägnanz.

**Acceptance criteria**

- Each screen has one primary action, visually dominant (`Button variant="primary"`).
- No page presents more than ~7 top-level choices without grouping/chunking.
- Field labels and section headings say what the thing is, not how the backend names it.
- Forms ask only for what the operation needs.

## 2. Providing feedback

Every action shows that it registered and what its consequence is — via loaders,
state changes, color, text.

**Backing laws:** Doherty Threshold, Goal-Gradient Effect.

**Acceptance criteria**

- Every `<form action={serverAction}>` submit uses `<PendingButton>` (disabled + spinner while pending).
- Every list/detail route segment has a `loading.tsx`.
- A successful mutation lands the user somewhere that visibly reflects the change (redirect to the updated record, or an inline success `Alert`).
- Responses under ~400ms need no spinner; longer ones must show one.

## 3. Consistent

Match external convention (other apps) and stay internally uniform — same control
behaves the same everywhere.

**Backing laws:** Jakob's Law, Law of Similarity, Law of Uniform Connectedness.

**Acceptance criteria**

- Shared page-header component (title + description + primary action) on every page.
- Same verb for the same operation everywhere ("Registrar", "Guardar", "Eliminar" — pick one each).
- Navigation, spacing container, and card usage identical across sections.
- Links look like links; buttons like buttons.

## 4. Forgiving

Prevent errors, surface them clearly when they happen, and always offer a way back.

**Backing laws:** Postel's Law, Peak-End Rule.

**Acceptance criteria**

- Server-action validation errors render inline near the field via `<Alert variant="danger">`, never as a full-page `error.tsx` throw.
- Every `new`/edit screen has a visible Cancel / back link.
- Destructive actions (delete DRAFT study, remove resident) require a confirm step (native `<dialog>` or two-click inline) and use `Button variant="danger"`.
- Irreversible-vs-reversible is stated in the confirm copy.

## 5. Providing guidance

Help users learn the product in place — onboarding hints, empty states, contextual help.

**Backing laws:** Paradox of the Active User, Zeigarnik Effect.

**Acceptance criteria**

- Every zero-row list renders `<EmptyState>` with a one-line explanation and the primary CTA.
- First-run of a multi-step area (e.g. defining a Procedure Type before recording a Surgery) links to the prerequisite.
- Field-level hint text where a term is domain-specific (CustomField `valueType`, Research lifecycle states).

## 6. Diversely accessible

Universal design: usable regardless of ability, device, or expertise. Adaptable —
accelerators for experts.

**Backing laws:** (accessibility is cross-cutting; see also Fitts's Law, Selective Attention.)

**Acceptance criteria**

- Meets the accessibility baseline in `design-system.md` (contrast, focus-visible, target size, `lang`, labels).
- Keyboard-only completion of every core flow.
- No information conveyed by color alone — pair with text/icon (badges include a label).
- Semantic HTML: real `<table>`, `<nav>`, `<form>`, heading order.

## 7. Satisfying

People use what they enjoy — visual attractiveness, delight, a coherent look.

**Backing laws:** Aesthetic-Usability Effect, Peak-End Rule, Von Restorff Effect.

**Acceptance criteria**

- Palette + Roboto applied uniformly; no leftover default/unstyled surfaces.
- Active nav section is visually distinguished (Von Restorff).
- Transitions on interactive state (`transition-colors`) are present but subtle.
- The end of a flow (record saved, study completed) reads as a clean, finished moment.

---

## Per-screen audit tracker (Milestone 10)

Done — every route group passes the acceptance criteria above, using the
shared primitives (`PageHeader`, `Breadcrumbs`, `ConfirmSubmit`,
`EmptyState`, `PendingButton`, `Badge`, `Skeleton`/`loading.tsx`) and
copy from `src/messages/en.ts`.

| Route group                       | Tokens | Loading | Empty | Feedback | Forgiving | Header/consistency |
| --------------------------------- | ------ | ------- | ----- | -------- | --------- | ------------------ |
| `(auth)/*`                        | ✅     | ✅      | n/a   | ✅       | ✅        | ✅                 |
| `(dashboard)` nav + landing       | ✅     | n/a     | n/a   | n/a      | n/a       | ✅                 |
| `patients/*` (+ nested surgeries) | ✅     | ✅      | ✅    | ✅       | ✅        | ✅                 |
| `research-studies/*`              | ✅     | ✅      | ✅    | ✅       | ✅        | ✅                 |
| `settings/procedure-types/*`      | ✅     | ✅      | ✅    | ✅       | ✅        | ✅                 |
| `staff/residents/*`               | ✅     | ✅      | ✅    | ✅       | ✅        | ✅                 |
| `resident/*`                      | ✅     | ✅      | ✅    | ✅       | ✅        | ✅                 |
| `error.tsx` / `not-found.tsx`     | ✅     | n/a     | n/a   | n/a      | ✅        | ✅                 |

Known follow-ups (not blockers): field-level (per-input) validation
errors are still a single inline `<Alert>` per form (deferred by product
decision); a few composed strings in `features/*/mappers.ts`
(`summarizeRules`, procedure-type `TYPE_LABELS` phrasing) are English but
not yet in `messages/en.ts` — the i18n extraction pass folds them in.

## Future i18n

`src/messages/en.ts` is the single extraction point. To internationalize:
add sibling catalogs (`es.ts`, …) with the same key shape, and replace the
direct `import { messages }` with a locale-aware loader
(`getTranslations()` in Server Components / `useTranslations()` in Client
Components) — no key changes, no per-screen edits. Function-valued
entries (e.g. `patients.noMatch(query)`) already isolate interpolation per
locale.

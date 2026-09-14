# Design System — Seguimiento de Cirugías

Living reference for the `packages/web` visual layer. Decisions here are
ratified in [ADR 0024](../decisions/0024-visual-design-direction.md); this
document is the day-to-day working reference. Principles that drive _why_ a
choice is made live in [ux-principles.md](./ux-principles.md).

Tokens are defined once in `packages/web/src/app/globals.css` (`:root`) and
exposed to Tailwind via the `@theme inline` block. **Never hard-code a hex in a
component** — add or reuse a token.

## Palette

| Name            | Hex       | Role                                                                 |
| --------------- | --------- | -------------------------------------------------------------------- |
| Midnight Ocean  | `#12304A` | `--foreground` — body text, headings, wordmark                       |
| Bermuda         | `#1C8087` | `--accent` / `--ring` — focus rings, non-text accents, primary hover |
| Melting Glacier | `#EAF4F6` | `--muted` — hover / selected / muted fills, table headers            |
| Dr. White       | `#F9FAFB` | `--background` — page canvas                                         |
| Silent Night    | `#526575` | source for `--muted-foreground` (darkened to `#46586A` for AA)       |

`--primary` is a darkened Bermuda (`#0F6B72`) so that white label text on a solid
primary button meets WCAG AA (≈4.8:1). True Bermuda (`#1C8087`) is `--accent`,
used where the color carries no text (focus ring, hover state, thin borders).

## Semantic colors

Derived to sit with the cool teal/navy palette without clashing (ADR 0024).

| Purpose              | fg token                                                                      | bg token                 | Use                                                         |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| Danger / destructive | `--danger` `#B42318`                                                          | `--danger-bg` `#FEF0EE`  | validation errors, delete actions, `Alert variant="danger"` |
| Warning              | `--warning-foreground` `#7A4E12` (text) · `--warning` `#B7791F` (icon/border) | `--warning-bg` `#FBF3E4` | reversible-but-risky states, `Alert variant="warning"`      |
| Success              | `--success` `#0F7B6C`                                                         | `--success-bg` `#E6F4F1` | confirmation messages, `Alert variant="success"`            |

## Typography

**Roboto**, loaded via `next/font/google` in `app/layout.tsx` (self-hosted — no
external stylesheet, CSP unaffected). Weights 400 / 500 / 700. Exposed as
`--font-roboto`, consumed through `--font-sans` (with a system fallback stack).

- Body: 14px (`text-sm`) / 400
- Labels, table headers, buttons: 500
- Card titles / section headings: `text-base` / 600, `--foreground`
- Uppercase micro-labels (table `<th>`): `text-xs` / 500 / `tracking-wide` / `--muted-foreground`

## Shape & spacing

- Radius: `--radius` `0.5rem` (`rounded-md`) everywhere — buttons, inputs, cards, badges use `rounded-full`.
- Surfaces: page is `--background`; cards and raised elements are `--surface` (`#FFFFFF`) with `border-border` + `shadow-sm`.
- Page container, by route intent (see `desktop-space-usage.md` — this app is
  desktop-first, no mobile target):
  - **Workspace** — `mx-auto max-w-[90rem] px-6 py-6` — every list and detail /
    editor route (`(dashboard)` and `resident/` `<main>`). The wide default.
  - **Form** — `FormLayout` (`mx-auto w-full max-w-2xl`) — every create / edit
    screen (`*/new`, `*/edit`), wrapped inside the workspace shell so a
    single-task form stays focused. Auth screens use the `(auth)` layout's own
    `max-w-sm`.
  - Detail screens use the two-column `DetailGrid` (primary work ‖ sticky
    context rail — see § Layout primitives and `desktop-space-usage.md` §4).
    Text blocks inside a workspace still cap their own measure (~65–80ch).
    Remaining per-screen polish (density pass, research edit as a 2×2 grid) is
    `desktop-space-usage.md` §7 steps 5–6.

## Components (`packages/web/src/components/ui/`)

| Component                 | Notes                                                                                                                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button.tsx`              | variants `primary` \| `secondary` \| `ghost` \| `danger`; sizes `default` (h-9) \| `sm` (h-8). Focus ring = `--ring` + offset.                                                                                                                                                                                       |
| `pending-button.tsx`      | `"use client"` submit button; shows `Spinner` + optional `pendingText` while the form is pending. Prefer over per-form bespoke submit buttons.                                                                                                                                                                       |
| `input.tsx` / `label.tsx` | token borders/rings; `aria-invalid` → danger border+ring.                                                                                                                                                                                                                                                            |
| `card.tsx`                | `--surface` bg, `shadow-sm`.                                                                                                                                                                                                                                                                                         |
| `alert.tsx`               | variants `danger` \| `warning` \| `success` \| `muted`. `role="alert"` on danger/warning only. Inline, expected messages — unexpected errors go through `app/error.tsx`.                                                                                                                                             |
| `badge.tsx`               | status pills; variants `neutral` \| `accent` \| `success` \| `warning` \| `danger`.                                                                                                                                                                                                                                  |
| `empty-state.tsx`         | title + hint + optional action; use for every zero-row list.                                                                                                                                                                                                                                                         |
| `spinner.tsx`             | indeterminate indicator, inherits `currentColor`.                                                                                                                                                                                                                                                                    |
| `skeleton.tsx`            | `Skeleton` block + `ListSkeleton` / `DetailSkeleton` for route `loading.tsx`.                                                                                                                                                                                                                                        |
| `table.tsx`               | header on `--muted`; row hover `--muted`. Rows are `position: relative` so they can host the **stretched-link** row pattern (see § Table below).                                                                                                                                                                     |
| `DangerousConfirm.tsx`    | `"use client"` — type-to-confirm `<dialog>` for data-destroying actions. Same mechanics as `ConfirmSubmit`; confirm button stays `disabled` until the user types the required phrase (record name, or literal `DELETE`). See § Destructive confirmation.                                                             |
| `Disclosure.tsx`          | native `<details>`/`<summary>` collapsible — no client JS. Folds a low-frequency form (an "add / record" form on a detail screen) away until needed. `defaultOpen` sets initial state only (renders no `open` attr when false, so a Server-Component re-render never resets it). See `desktop-space-usage.md` §3 P3. |

## Layout primitives (`packages/web/src/components/`)

| Component           | Notes                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader.tsx`    | title + optional description + optional action (CTA node); `level` 1 or 2. The one page-title treatment — no ad-hoc `<div><h1>…</div>`.                                                                  |
| `Breadcrumbs.tsx`   | ordered `{ label, href? }[]` trail for nested routes; last crumb is current, never a link. Replaces "← Back to X".                                                                                       |
| `ConfirmSubmit.tsx` | `"use client"` — a destructive Server-Action submit behind a native `<dialog>` (consequence sentence + Cancel / Confirm). No dependency. Use for delete / remove / lock-out.                             |
| `DashboardNav.tsx`  | `"use client"` — the four-section nav with active-section highlight (`usePathname`).                                                                                                                     |
| `FormLayout.tsx`    | narrow centred wrapper (`max-w-2xl`) for a single-task create/edit screen, inside the wide workspace shell. Server Component. See `desktop-space-usage.md` §3 P1.                                        |
| `DetailGrid.tsx`    | `primary` + `aside` slots — wide work column ‖ sticky context rail; single column below `lg` (aside last). Server Component. See `desktop-space-usage.md` §3 P2. Not yet adopted by any screen (step 3). |

## Table

- Header row on `--muted`; body rows `divide-y`; row hover `--muted/60`.
- **The whole row is the link** (finding F-04). Every list/table row navigates
  to its detail on a click anywhere in the row — not just on the name cell.
  Implemented as an accessible **stretched-link** pattern, not an `onClick` on
  `<tr>`:
  - `TableRow` is `position: relative` by default.
  - The first cell holds one real `<Link>` / `<a>`; it carries
    `stretchedLinkClass` from `table.tsx`, whose `::after` is an
    absolutely-positioned overlay (`inset-0`) covering the row. Keyboard focus
    and the accessible name stay on the real `<a>`; the focus ring renders on
    it.
  - Any inline secondary control in the same row (delete / remove / credential
    action) must carry `rowActionClass` (`relative z-10`) so it sits above the
    overlay and stays clickable and focusable.
  - Applied in `PatientList`, `SurgeryList`, `ProcedureTypeList`,
    `ResearchStudyList`, and the resident-session `OwnSurgeryList`. `ResidentList`
    has no detail route, so its rows are not links.

## Destructive confirmation — two tiers

Both tiers are a native `<dialog>` gating a Server Action; they differ only in
how much friction the confirm step carries (finding F-05, `ux-principles.md`
§4 Forgiving).

| Tier            | Component              | Use for                                                                                                                                                             | Gate                                                                          |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Light           | `ConfirmSubmit.tsx`    | **reversible** actions — log out, research-study state transitions (`COMPLETED` is reversible)                                                                      | consequence sentence + Cancel / Confirm                                       |
| Type-to-confirm | `DangerousConfirm.tsx` | **data-destroying / no-undo** actions — delete a draft research study, remove a Surgery from a study, remove a Resident from a Surgery, deactivate a Resident login | confirm button is `disabled` until the user types the required phrase exactly |

The required phrase is the record's own human name when it has one (e.g. the
resident's full name); otherwise the literal word `DELETE` (from
`messages.common.deleteWord`). The match is exact after trimming, case-sensitive
(`matchesConfirmationPhrase` in `components/ui/dangerous-confirm.ts`). Copy for
the prompt comes from `messages.common.dangerousConfirm.prompt(phrase)`.

## Accessibility baseline

- Contrast: ≥4.5:1 for body text, ≥3:1 for large text and UI boundaries. Verified for `--foreground`/`--muted-foreground` on `--background`, white on `--primary`, `--danger` on `--danger-bg`.
- Every interactive element keeps a visible `focus-visible` ring (never `outline: none` without a replacement).
- Interactive targets ≥ 36px in the smaller dimension (`h-9` default, `h-8` only for dense secondary actions).
- `<html lang="en">` (English is primary; ADR 0023); form controls always have an associated `<Label htmlFor>`.

## Copy

All user-facing strings live in `src/messages/en.ts` (one typed `as const`
object, imported directly), in English. `brand.name` is a proper noun and
is never translated. See `ux-principles.md` § "Future i18n".

## Not in scope (this pass)

- Dark mode — the `prefers-color-scheme` block was removed; re-add as a full second token set when revisited.
- Any new component-library / Tailwind-plugin dependency.
- Field-level (per-input) validation errors — forms show one inline `<Alert>`; deferred by product decision.

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
- Standard page container: `mx-auto max-w-5xl px-4 py-6` (already the layout convention).

## Components (`packages/web/src/components/ui/`)

| Component                 | Notes                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `button.tsx`              | variants `primary` \| `secondary` \| `ghost` \| `danger`; sizes `default` (h-9) \| `sm` (h-8). Focus ring = `--ring` + offset.                                           |
| `pending-button.tsx`      | `"use client"` submit button; shows `Spinner` + optional `pendingText` while the form is pending. Prefer over per-form bespoke submit buttons.                           |
| `input.tsx` / `label.tsx` | token borders/rings; `aria-invalid` → danger border+ring.                                                                                                                |
| `card.tsx`                | `--surface` bg, `shadow-sm`.                                                                                                                                             |
| `alert.tsx`               | variants `danger` \| `warning` \| `success` \| `muted`. `role="alert"` on danger/warning only. Inline, expected messages — unexpected errors go through `app/error.tsx`. |
| `badge.tsx`               | status pills; variants `neutral` \| `accent` \| `success` \| `warning` \| `danger`.                                                                                      |
| `empty-state.tsx`         | title + hint + optional action; use for every zero-row list.                                                                                                             |
| `spinner.tsx`             | indeterminate indicator, inherits `currentColor`.                                                                                                                        |
| `table.tsx`               | header on `--muted`; row hover `--muted`.                                                                                                                                |

## Accessibility baseline

- Contrast: ≥4.5:1 for body text, ≥3:1 for large text and UI boundaries. Verified for `--foreground`/`--muted-foreground` on `--background`, white on `--primary`, `--danger` on `--danger-bg`.
- Every interactive element keeps a visible `focus-visible` ring (never `outline: none` without a replacement).
- Interactive targets ≥ 36px in the smaller dimension (`h-9` default, `h-8` only for dense secondary actions).
- `<html lang="es">`; form controls always have an associated `<Label htmlFor>`.

## Not in scope (this pass)

- Dark mode — the `prefers-color-scheme` block was removed; re-add as a full second token set when revisited.
- Any new component-library / Tailwind-plugin dependency.
- UI copy language normalization (some strings are still English) — tracked separately.

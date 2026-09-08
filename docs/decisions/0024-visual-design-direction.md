# 0024 — Visual design direction: palette, Roboto, semantic colors, light-only

## Status

Accepted (current iteration). Unblocks the **visual/design-system half of
Milestone 10** (`docs/architecture/ROADMAP.md` § "Milestone 10"), which was
explicitly waiting on a product-owner design direction. Supersedes the
deliberately-minimal `components/ui/*` stopgap adopted for Milestone 8
(plain semantic HTML + `class-variance-authority`, "not the final look").
Complements [ADR 0023](0023-product-name-seguimiento-de-cirugias.md) (name).

## Context

Every screen in `packages/web` was built against ad-hoc Tailwind classes
and a placeholder token set (including a `prefers-color-scheme` dark
block that was never designed). The product owner flagged that continuing
to add components against ad-hoc styling makes the eventual redesign more
expensive, and supplied the direction:

- A five-swatch palette (a color-tool screenshot).
- Typography: Roboto.
- A 7-point UI principles checklist (recorded in
  `docs/design/ux-principles.md`), anchored to Laws of UX.
- Left to derive: a `warning` and a `destructive` color that fit the
  palette.

## Decision

**Palette** (light): Midnight Ocean `#12304A`, Bermuda `#1C8087`,
Melting Glacier `#EAF4F6`, Dr. White `#F9FAFB`, Silent Night `#526575`.
Token mapping in `packages/web/src/app/globals.css` (`:root`):

- `--background` `#F9FAFB`, `--surface` `#FFFFFF`, `--foreground` `#12304A`,
  `--muted` `#EAF4F6`, `--muted-foreground` `#46586A` (Silent Night
  darkened to clear WCAG AA on the background), `--border` `#D6E1E5`.
- `--primary` `#0F6B72` (Bermuda darkened so white label text on a solid
  button meets AA ≈4.8:1); `--accent` / `--ring` `#1C8087` (true Bermuda,
  used only where the color carries no text).

**Semantic colors** (derived — low chroma so they sit with the cool
palette instead of fighting the teal):

- `--danger` `#B42318` on `--danger-bg` `#FEF0EE`.
- `--warning` `#B7791F` (icon/border) with `--warning-foreground` `#7A4E12`
  (text) on `--warning-bg` `#FBF3E4`.
- `--success` `#0F7B6C` on `--success-bg` `#E6F4F1`.

**Typography**: Roboto (400/500/700) via `next/font/google` in
`app/layout.tsx` — self-hosted, so no external stylesheet and the
Milestone 8 strict CSP is unaffected. Consumed via `--font-sans`.

**Light-only for now**: the `@media (prefers-color-scheme: dark)` block
is **removed**. Dark mode returns as a deliberately-designed second token
set when it's picked up again — a half-designed dark palette is worse
than none.

**No new dependency**: `components/ui/*` keeps its current shape
(cva variants, `cn`, plain semantic elements, Base UI only where already
used). No shadcn install, no Tailwind plugins, no component library.

**Working references**: `docs/design/design-system.md` (tokens,
components, a11y baseline) and `docs/design/ux-principles.md` (the 7
principles + per-screen acceptance criteria) are the living companions to
this ADR.

## Consequences

- `globals.css` rewritten (token values + `@theme inline` map); `body`
  font moves to `next/font`. `<html lang="es">`.
- `components/ui/*` restyled to the tokens; `button` gains a `danger`
  variant; `alert` gains `warning` / `success`. New shared primitives:
  `badge`, `empty-state`, `spinner`, `pending-button`.
- The Milestone 10 per-screen audit (feedback / empty / loading /
  forgiving states across every route) proceeds against
  `ux-principles.md`'s tracker.
- The `ux-laws` skill is the always-on implementation reference.

## Not decided here

- Dark mode (deferred, as above).
- A logo/iconography system beyond the plain-text wordmark.
- UI copy language normalization (some strings remain English) — real,
  but tracked separately from this visual pass.
- Any information-architecture change — the four-section nav
  (Milestone 10's other half) is already decided and merged.

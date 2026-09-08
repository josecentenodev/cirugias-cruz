---
name: ux-laws
description: The design/UX checklist for Seguimiento de Cirugías (this repo's `packages/web` Next.js app) — the product owner's 7 UI principles (clear & concise, provide feedback, consistent, forgiving, provide guidance, diversely accessible, satisfying), each mapped to the specific Laws of UX (lawsofux.com) that back it, plus how to apply them in this codebase (Server Components first, feedback via Server Action pending state, tokens from globals.css). Use this whenever building, restyling, reviewing, or auditing any screen, component, form, empty state, error state, or navigation in `packages/web`, or when a task mentions UX, UI, design, layout, accessibility, "the redesign", or Milestone 10's visual half. Pair with the design-system doc (docs/design/design-system.md) for tokens/components and ux-principles.md for the full acceptance criteria. Defers to `seguimiento-cirugias-project` for domain and architecture boundaries — this skill governs look, feel, and interaction only, never what the app does.
---

# Laws of UX — working checklist

Reference: <https://lawsofux.com/>. Full prose + acceptance criteria:
`docs/design/ux-principles.md`. Tokens + components: `docs/design/design-system.md`.
Ratified in ADR 0024 (visual direction) / ADR 0023 (product name).

Apply the **7 principles** to every screen. Each links to the Laws that justify it.

## 1. Clear and concise

One dominant primary action per screen. Don't exceed ~7 ungrouped choices. Labels
name the thing, not the backend field. Ask only for what the operation needs.
→ _Hick's Law, Miller's Law, Occam's Razor, Tesler's Law, Law of Prägnanz._

## 2. Providing feedback

Every Server-Action form → `<PendingButton>` (disabled + `<Spinner>` while
pending). Every list/detail segment → a `loading.tsx`. Every successful mutation
lands somewhere that shows the change (redirect to the record, or a success
`Alert`). <400ms needs no spinner; longer does.
→ _Doherty Threshold, Goal-Gradient Effect._

## 3. Consistent

Shared page-header (title + description + primary action). One verb per operation.
Identical nav / container (`mx-auto max-w-5xl px-4 py-6`) / card usage everywhere.
Links look like links, buttons like buttons.
→ _Jakob's Law, Law of Similarity, Law of Uniform Connectedness._

## 4. Forgiving

Validation errors inline via `<Alert variant="danger">` near the field — never a
full-page `error.tsx` throw for an expected error. Cancel/back link on every
new/edit screen. Destructive actions: confirm step + `Button variant="danger"` +
say whether it's reversible.
→ _Postel's Law, Peak-End Rule._

## 5. Providing guidance

Every zero-row list → `<EmptyState>` (one-line why + primary CTA). Link to
prerequisites (e.g. define a Procedure Type before a Surgery). Hint text on
domain-specific terms.
→ _Paradox of the Active User, Zeigarnik Effect._

## 6. Diversely accessible

Contrast ≥4.5:1 body / ≥3:1 large & UI. Visible `focus-visible` ring always.
Targets ≥36px. Keyboard-only completion of every core flow. Never color alone —
badges carry a label. Semantic HTML, correct heading order, `<html lang="en">`,
`<Label htmlFor>` on every control.
→ _Fitts's Law, Selective Attention; accessibility baseline in design-system.md._

## 7. Satisfying

Palette + Roboto applied uniformly — no unstyled surfaces. Active nav section
visually distinct. Subtle `transition-colors` on interactive state. The end of a
flow reads as finished.
→ _Aesthetic-Usability Effect, Peak-End Rule, Von Restorff Effect._

---

## Applying in this codebase

- **Server Components are the default.** Reach for `"use client"` only for a
  genuinely interactive leaf (a form's pending state, a confirm dialog). Don't
  add client state for something SSR/Server Actions already do. (`seguimiento-cirugias-project`
  rule 8.)
- **Feedback** comes from `useFormStatus` inside a Client leaf —
  `components/ui/pending-button.tsx` is the shared one; prefer it over new bespoke
  `SubmitButton` copies.
- **Colors**: only tokens from `app/globals.css` (`--foreground`, `--muted`,
  `--primary`, `--accent`, `--danger`/`--warning`/`--success` + `-bg`). No raw
  hex in components.
- **Copy**: every user-facing string comes from `src/messages/en.ts` (English,
  imported directly) — no string literals in JSX. `brand.name` is a proper noun,
  never translated. This module is the i18n extraction point.
- **Primitives** — `components/ui/`: `button` (primary/secondary/ghost/danger),
  `alert` (danger/warning/success/muted), `badge`, `empty-state`, `spinner`,
  `skeleton` (+ `ListSkeleton`/`DetailSkeleton`), `pending-button`, `card`,
  `input`, `label`, `table`. `components/`: `PageHeader`, `Breadcrumbs`,
  `ConfirmSubmit` (native `<dialog>` for destructive actions), `DashboardNav`.
  Every list gets an `EmptyState`; every list/detail route segment gets a
  `loading.tsx`; every destructive action gets a `ConfirmSubmit`.
- **Light-only** right now — no `dark:` variants, no `prefers-color-scheme` (ADR 0024).
- **Scope guard**: this skill never motivates a domain/API/schema change. If a UX
  improvement seems to need one, say so and defer to `seguimiento-cirugias-project`.

## The 30 Laws (one-liners)

Aesthetic-Usability Effect · Choice Overload · Chunking · Cognitive Bias ·
Cognitive Load · Doherty Threshold (<400ms) · Fitts's Law (distance & size to
target) · Flow · Goal-Gradient Effect · Hick's Law (choices → decision time) ·
Jakob's Law (work like other sites) · Law of Common Region · Law of Proximity ·
Law of Prägnanz (simplest form) · Law of Similarity · Law of Uniform
Connectedness · Mental Model · Miller's Law (7±2 in working memory) · Occam's
Razor · Paradox of the Active User (nobody reads manuals) · Pareto Principle
(80/20) · Parkinson's Law · Peak-End Rule · Postel's Law (liberal in, conservative
out) · Selective Attention · Serial Position Effect · Tesler's Law (irreducible
complexity) · Von Restorff Effect (the different one is remembered) · Working
Memory · Zeigarnik Effect (unfinished tasks stick).

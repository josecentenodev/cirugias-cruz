# Desktop space usage — killing the single-column scroll

> **Status:** design investigation → **implemented** (steps 1–6, 2026-09-10;
> see §7). Product owner raised it 2026-09-10: the app is **desktop-first,
> with no mobile target now or planned**, and the screens waste horizontal
> space — everything is one tall vertical column (name, then its fields,
> then its list, then the add form, then the next list, then its add
> form…). This document analyses the pattern, maps it to the Laws of UX,
> proposes a **specific layout per screen** (§4), and records the
> implementation plan and its status (§7). Companion to `design-system.md`
> (tokens/components) and `ux-principles.md` (the 7 principles). The work
> is **presentational only** — it changed no domain / application / API /
> schema code, only `packages/web` layout components and two copy keys
> (`ux-laws` scope guard).

---

## 1. The problem, precisely

Every dashboard screen is built the same way:

```
<main class="mx-auto max-w-5xl px-4 py-6">      ← centred, capped at 1024px
  <div class="flex flex-col gap-4">             ← one vertical stack
    <Card> … </Card>                            ← 100% width
    <Card> … </Card>                            ← 100% width
    <Card> … </Card>                            ← 100% width
    …
```

Two compounding causes:

### 1a. The container is capped for _reading_, not for _working_

`max-w-5xl` (= `64rem` = 1024px) is the right width for an article. On a
real clinical workstation (1440–1920px wide) it leaves **35–55 % of the
screen as empty gutter**, and forces content that could sit side by side
into a stack.

`design-system.md` currently asserts `mx-auto max-w-5xl px-4 py-6` as
_"the layout convention"_ — that line is the root of the pattern and this
document proposes changing it (for workspace routes only — see §3).

### 1b. One full-width card per concern, stacked

The cited example — **Procedure Type detail**
(`settings/procedure-types/[id]`) — renders **five** full-width cards in a
column:

| #   | Card                 | What it is                                             |
| --- | -------------------- | ------------------------------------------------------ |
| 1   | `{name}` + edit form | the aggregate's own two fields                         |
| 2   | CustomFields         | the list of field definitions                          |
| 3   | Add a CustomField    | a **persistent** 6-input form for an occasional action |
| 4   | Control types        | the list of control definitions                        |
| 5   | Add a control type   | another **persistent** form                            |

On a 1440px screen this is ~3–4 viewport-heights of scrolling for a
screen whose actual content would fit in **one** viewport if it used the
width. The "add" cards (3 and 5) are the worst offenders: a large,
always-open form occupying prime vertical space for something the
physician does a handful of times ever.

The same shape repeats on **Surgery detail** (4 stacked cards),
**Research Study detail** (2 stacked cards, one containing 4 stacked
textareas), **Patient detail** (card + section + list), and the resident
Surgery panel.

### 1c. What it costs (measured against the Laws of UX)

| Law                                       | How the single column violates it                                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Law of Proximity / Common Region**      | A list and the form that adds to it are separated by a full card gap and often a scroll — they read as unrelated.                                                                        |
| **Miller's Law / Working Memory (7±2)**   | Filling "Add a CustomField" scrolls the existing field list out of view; the physician loses the reference they're working against.                                                      |
| **Serial Position Effect**                | The _primary_ work (Control history, follow-up schedule) is buried between secondary panels (residents, add-forms). First and last positions — the memorable ones — are spent on chrome. |
| **Doherty Threshold / Goal-Gradient**     | A 4-screen scroll with no visible structure makes the task feel unbounded and unfinished.                                                                                                |
| **Aesthetic-Usability Effect**            | Wide empty gutters on a clinical tool read as unfinished — and users rate an unpolished UI as _less usable_ even when it works.                                                          |
| **Jakob's Law**                           | Every desktop clinical / admin tool the physician already uses (EMRs, dashboards) is master-detail or multi-pane. A centred 1024px column is not what they expect from "a desktop app".  |
| **Law of Similarity / Chunking**          | Cards _are_ good chunks — but they're currently chunked by _database table_, not by _task_.                                                                                              |
| **Tesler's Law (irreducible complexity)** | A Surgery genuinely has summary + follow-up + controls + roster. That complexity can't be deleted — but it can be _arranged in space_ instead of _stacked in time (scroll)_.             |
| **Law of Prägnanz**                       | A two-region layout — "what I'm doing" beside "context I need" — is a simpler figure to parse than an 8-item vertical list.                                                              |
| **Fitts's Law**                           | On a wide screen a centred narrow column pushes primary actions far from the resting cursor/eye position; a left-aligned work column with a right rail keeps them close.                 |

---

## 2. What "use the space" does **not** mean

Guardrails so the fix doesn't overcorrect:

- **Not "stretch everything edge to edge."** Text still needs a
  comfortable measure (~65–80 characters). Prose blocks (research fields,
  hints, observations) keep their own `max-w` inside a wider container.
- **Not "widen the create/edit forms."** A focused single-task form
  (`patients/new`, `surgeries/new`, …) is _correct_ as a narrow centred
  column — Prägnanz and Selective Attention want one thing in view. The
  rule is **widen _workspaces_, keep _single-task forms_ narrow.**
- **Not "cram in more density everywhere."** Increase information density
  only where the content is scannable data (tables, metadata grids), not
  where it's reading or data entry.
- **No horizontal scrolling of the page.** Two columns collapse to one
  below the `lg` breakpoint; desktop-first doesn't mean desktop-only-or-broken.

---

## 3. The toolkit (patterns to introduce)

These are the reusable building blocks the per-screen proposals in §4 draw
on. Names are provisional.

### P1 — Two container widths, chosen by route intent

| Width         | Token (proposed)                | Used by                                                                      |
| ------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| **Workspace** | `max-w-[90rem]` (1440px) `px-6` | every list and every detail/editor route under `(dashboard)` and `resident/` |
| **Form**      | `max-w-2xl` (672px) centred     | `*/new`, `*/edit`, auth, `check-email`, `change-password`                    |

Mechanism: the `(dashboard)` layout switches its `<main>` to the
workspace width; the `new`/`edit` segments wrap their own content in a
`FormLayout` (narrow, centred) so a create form stays focused inside the
wider shell. Auth layout is already effectively narrow — formalise it.

### P2 — `DetailGrid` — primary work + sticky context rail

A CSS-grid detail layout:

```
lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:gap-8
┌───────────────────────────────┬───────────────────┐
│ PRIMARY (what you came to do)  │ ASIDE (context)   │
│ – the main list / editor       │  lg:sticky top-6  │
│ – its inline add affordance    │  self-start       │
│                                │  summary + meta   │
│                                │  secondary panels │
└───────────────────────────────┴───────────────────┘
```

- **Primary column comes first in the DOM** (reading / focus order,
  screen-reader sanity) even though it's visually left.
- **Aside is `position: sticky`** so summary/metadata stays on screen
  while the primary column scrolls.
- Below `lg`: single column, aside falls _below_ primary (context after
  the work — acceptable, since it's supporting).

### P3 — Collapse persistent "Add X" forms into disclosure

Replace the always-open "Add a CustomField" / "Add a control type" card
with a compact trigger (`+ Add field`) that reveals the form **in place**
— native `<details>`/`<summary>`, or an inline expander row. Closed by
default. This alone removes cards 3 and 5 from the Procedure Type screen.

### P4 — Collections edit in place, with an "add row" at the end

`ControlDefinitionList` already does inline row-editing. Extend the
pattern: the "add" is the **last row of the same table** (`+ new…`),
not a separate card. One visual object = "the scheme", not "a list" + "a
form".

### P5 — In-page section rail for legitimately long detail pages

When a detail page really has 3+ major sections (Surgery detail), the
sticky aside can carry a short anchor list ("Summary · Follow-up ·
Controls · Residents") so the physician can jump, and always knows where
they are (Zeigarnik / orientation).

### P6 — Density pass on read-only metadata

Metadata grids are `sm:grid-cols-2` today. In a wider container they
become `lg:grid-cols-3` / `-4` with tighter vertical rhythm
(`gap-x-8 gap-y-3`). Applies to Patient identity, Surgery summary,
Research read-view.

---

## 4. Per-screen proposals

### 4.1 Procedure Type detail — `settings/procedure-types/[id]` (the cited case)

**Now:** 5 stacked full-width cards, ~3–4 viewports.

**Proposed — `DetailGrid` + disclosure add-forms:**

```
┌─ PRIMARY (2fr) ───────────────────────────┬─ ASIDE (1fr, sticky) ─┐
│ CUSTOM FIELDS                             │ Pterigión             │
│  ┌───────────────────────────────────┐    │  ├ name  [ Autoinjerto…]│
│  │ name        scope   type   ▸ edit │    │  └ description […]      │
│  │ Tamaño      CONTROL  NUMBER ▸ edit │    │  [ Save ]              │
│  │ Técnica     SURGERY  ENUM   frozen │    │                       │
│  │ + Add field ▾  (disclosure)        │    │ Scheme                │
│  └───────────────────────────────────┘    │  3 custom fields      │
│                                           │  2 control types      │
│ CONTROL TYPES                             │                       │
│  ┌───────────────────────────────────┐    │ ⓘ A definition freezes│
│  │ name        rule           ▸ edit │    │   once a Control or   │
│  │ Escala EVA  4× / 24h       frozen │    │   value references it.│
│  │ Curación    uncapped       ▸ edit │    │                       │
│  │ + Add control type ▾                │    │                       │
│  └───────────────────────────────────┘    │                       │
└───────────────────────────────────────────┴───────────────────────┘
```

- The **name/description edit form moves to the aside** — it's identity
  metadata, edited rarely, not the reason you opened the screen.
- The two scheme tables become the primary column, each with an **inline
  `+ Add` disclosure row** (P3/P4) instead of a separate card.
- Aside also carries the **counts** and the **freeze-rule hint** (ADR 0027) — guidance where it's needed (principle 5), not as a wall of
  text.
- Result: **~4 viewports → 1**. If the workstation is ≥1600px, the two
  tables can even sit side by side (`xl:grid-cols-2` _within_ the primary
  column); at 1280–1440 they stack, which is fine.

### 4.2 Surgery detail — `patients/[id]/surgeries/[surgeryId]`

**Now:** 4 stacked cards — Summary / Follow-up schedule / Control history
(+ inline record form) / Residents.

**Proposed — `DetailGrid`, primary = the follow-up work:**

```
┌─ PRIMARY (2fr) ───────────────────────────┬─ ASIDE (1fr, sticky) ─┐
│ CONTROL HISTORY                          │ SUMMARY               │
│  ┌───────────────────────────────────┐    │  Procedure  Pterigión │
│  │ 2026-01-12  EVA 3   Dr. Cruz       │    │  Performed  2026-01-10 │
│  │ 2026-01-11  EVA 5   Dr. Cruz       │    │  Técnica    Autoinj.  │
│  │ …                                  │    │                       │
│  │ + Record control ▾  (disclosure)   │    │ FOLLOW-UP             │
│  └───────────────────────────────────┘    │  Escala EVA  2 / 4    │
│                                           │   next ~2026-01-13    │
│                                           │  Curación   —         │
│                                           │                       │
│                                           │ RESIDENTS            │
│                                           │  · R. Pérez  (remove) │
│                                           │  + Assign resident ▾  │
└───────────────────────────────────────────┴───────────────────────┘
```

- **Control history is the primary column** — reviewing and adding
  follow-up is why the physician opened a Surgery (this is the B5 intent
  from Milestone 11, taken further).
- **Record-control form** becomes a `+ Record control` disclosure at the
  top of the history (or a right-rail action) — it's currently a big
  always-open block that pushes history down.
- **Summary + Follow-up + Residents move to the sticky aside** — all
  three are _context_ for the follow-up work. Follow-up becomes a
  compact at-a-glance widget ("2 / 4, next ~date"), not a full-width card.
- Resident assign/remove is a low-frequency action → disclosure in the
  aside.
- The resident panel `resident/surgeries/[id]` gets the **same layout**
  (history primary, summary/follow-up aside; no resident-management aside
  since a resident can't edit the roster).

### 4.3 Patient detail — `patients/[id]`

**Now:** Patient identity `Card` (2-col grid) → `PageHeader` "Surgeries"
→ `SurgeryList` table. All ≤1024px wide.

**Proposed — `DetailGrid`, primary = the surgery list:**

```
┌─ PRIMARY (2fr) ───────────────────────────┬─ ASIDE (1fr, sticky) ─┐
│ SURGERIES                    [ + Register]│ Ana García            │
│  ┌───────────────────────────────────┐    │  DNI    30.111.222    │
│  │ date        procedure     controls │    │  Age    46            │
│  │ 2026-01-10  Pterigión OD  2        │    │  Born   1980-04-12    │
│  │ 2025-11-02  Pterigión OS  5        │    │  Notes  …             │
│  └───────────────────────────────────┘    │                       │
└───────────────────────────────────────────┴───────────────────────┘
```

- The **surgery list is the reason you're on this page** → primary
  column, wide enough to add columns it can't fit today (e.g. a
  `# controls` count, technique) without truncation.
- **Patient identity → compact sticky aside** (P6 density: `age`, `dni`,
  `dob` on tight rows; `observations` full-width under them).
- The "Register a Surgery" CTA sits on the list's own header, not a
  separate `PageHeader` block.

### 4.4 Research Study detail — `research-studies/[id]`

**Now:** Card 1 = 4 research textareas (2×2 read grid; **4 stacked**
textareas in edit mode) + status/lifecycle actions. Card 2 = the Surgery
universe list + add-surgery form.

**Proposed — `DetailGrid`, primary = the writing:**

```
┌─ PRIMARY (2fr) ───────────────────────────┬─ ASIDE (1fr, sticky) ─┐
│ HYPOTHESIS            RESULTS             │ Status   IN_PROGRESS  │
│  [ textarea…      ]   [ textarea…      ]  │  [→ Complete] [Reopen] │
│                                          │  [Delete] (DRAFT only) │
│ ANALYSIS             CONCLUSION           │                       │
│  [ textarea…      ]   [ textarea…      ]  │ SURGERY UNIVERSE (7)   │
│                                          │  · García — Pter… ✕   │
│  [ Save ]  [ Cancel ]                     │  · López  — Pter… ✕   │
│                                          │  + Add surgery ▾      │
└───────────────────────────────────────────┴───────────────────────┘
```

- **Edit mode uses a 2×2 grid of textareas**, not 4 stacked — halves the
  form height, keeps all four fields of a single argument in view
  together (Proximity: they're one thought).
- **Status + lifecycle actions → top of aside** (they gate everything
  else).
- **Surgery universe → aside** as a scannable list with inline remove and
  a `+ Add surgery` disclosure. _Tradeoff:_ a very large universe (dozens
  of surgeries) outgrows a rail — if that becomes real, promote the
  universe to its own full-width section _below_ the grid. Not now.

### 4.5 List pages — `patients` · `settings/procedure-types` · `staff/residents` · `research-studies`

**Now:** `PageHeader` + (Patients only) search toolbar + one table, all
`max-w-5xl`.

**Proposed — widen only (P1), no second column:**

- Tables are the one thing that genuinely wants width. Moving to the
  **workspace container** lets:
  - Patients show `age`, `dni`, `dob`, and a `# surgeries` count without
    wrapping (the surgery count is already-loaded data on other screens).
  - Procedure Types / Residents show more per row (counts, last-updated).
- Keep the single-table layout; no aside needed.
- Patients search stays a **top toolbar** (Common Region: filter controls
  grouped above the data they filter), not a left rail.
- The whole-row link (F-04, done) already helps; width makes rows less
  cramped so the target is bigger (Fitts).

### 4.6 Create / edit forms — `*/new`, `*/edit`

**No change to width — this is deliberate.** Wrap in `FormLayout`
(narrow, centred, `max-w-2xl`) inside the wider shell. One task, one
column, Cancel/back link present (principle 4). `surgeries/new` and
`procedure-types/new` with their conditional field groups still fit one
column comfortably.

### 4.7 Auth screens — `login` · `signup` · `check-email` · `confirm-email` · `change-password`

Already effectively narrow single-column. **Leave as-is**; just make sure
they use the same `FormLayout` primitive for consistency (principle 3).

### 4.8 Dashboard landing — `(dashboard)/page.tsx`

Currently a bare `redirect("/patients")`. When a real landing page is
built it's the natural home for a **multi-tile overview grid** (recent
surgeries, follow-ups due, counts) — a genuine use of width. Out of scope
now; flagged so the wide container is in place when it lands.

---

## 5. Summary table

| Screen                 | Now                          | Proposed                                          | Primary pattern      |
| ---------------------- | ---------------------------- | ------------------------------------------------- | -------------------- |
| Procedure Type detail  | 5 stacked cards              | 2-col: scheme tables ‖ identity + hints           | `DetailGrid` + P3/P4 |
| Surgery detail         | 4 stacked cards              | 2-col: control history ‖ summary+follow-up+roster | `DetailGrid` + P3/P5 |
| Resident Surgery panel | stacked                      | 2-col: control history ‖ summary+follow-up        | `DetailGrid`         |
| Patient detail         | card + list stacked          | 2-col: surgery list ‖ patient identity            | `DetailGrid` + P6    |
| Research Study detail  | 2 cards, 4 stacked textareas | 2-col: 2×2 field grid ‖ status+universe           | `DetailGrid` + P6    |
| List pages (4)         | `max-w-5xl` table            | workspace-width table, more columns               | P1 only              |
| `*/new`, `*/edit`      | narrow-ish                   | explicit narrow `FormLayout`                      | P1 (narrow)          |
| Auth (5)               | narrow                       | same `FormLayout`                                 | P1 (narrow)          |
| Dashboard landing      | redirect                     | (future) overview tile grid                       | P1 + tiles           |

---

## 6. Docs to update when this is implemented (not now)

- **`design-system.md` § Shape & spacing** — replace the single
  "Standard page container: `mx-auto max-w-5xl`" line with the two widths
  (P1) and add `DetailGrid` + `FormLayout` to § Layout primitives.
- **`ux-principles.md`**
  - § 3 Consistent — the "workspace vs single-task-form" width rule; one
    detail-page layout (`DetailGrid`) used everywhere.
  - § 1 Clear and concise / Serial Position — "the primary task goes in
    the main column; context and low-frequency actions go in the rail or
    behind a disclosure."
  - § 6 Accessible — two-column detail layouts keep source order =
    primary-first; sticky rail must not overlap focus targets; heading
    order unaffected by visual columns.
- **No ADR.** This is layout/visual only — it changes no route, no data,
  no component contract beyond CSS/structure. It does amend a line in
  `design-system.md` that was previously stated as settled, so it should
  land as its own reviewed change with before/after screenshots.

## 7. Implementation sketch (for the eventual build task)

1. **DONE (2026-09-10).** Added `components/FormLayout.tsx`; moved
   `(dashboard)` and `resident/` `<main>` + header rows from
   `max-w-5xl px-4` to `max-w-[90rem] px-6`; wrapped the five `*/new`
   pages in `FormLayout` (no `*/edit` routes exist — editing is inline).
   `design-system.md` § Shape & spacing + § Layout primitives updated.
   Lint / format / web typecheck / 221 web tests green. Nothing else
   changed.
2. **DONE (2026-09-10).** `components/DetailGrid.tsx` added — `primary` +
   `aside` props, `lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]`,
   `lg:sticky lg:self-start` aside, single column (aside last) below
   `lg`. Not adopted by any screen yet — that is step 3.
3. **DONE (2026-09-10).** All four detail screens plus the resident
   Surgery panel now use `DetailGrid`:
   - **Procedure Type detail** — primary: the two scheme editor cards
     (CustomFields + Control types, list + add each); aside: the
     name/description edit card.
   - **Surgery detail** — primary: Control history + inline record form;
     aside: Summary, Follow-up schedule, Residents.
   - **Patient detail** — primary: Surgeries header + list; aside: the
     patient identity card.
   - **Research Study detail** — primary: the four research text fields;
     aside: Status + lifecycle actions, then the Surgery universe.
   - **Resident Surgery panel** — primary: Control history + record form;
     aside: a compact procedure/date card (the summary moved out of the
     `PageHeader` description).
     The "Add X" forms are still full cards inside the primary column —
     folding them into a disclosure is step 4. Added one message key
     (`research.statusCardTitle`). Lint / format / web typecheck / 221
     web tests green; visual + keyboard/sticky verification still needs a
     real authenticated render (Playwright or a human pass).
4. **DONE (2026-09-10).** `components/ui/Disclosure.tsx` added (native
   `<details>`/`<summary>`, zero client JS, `defaultOpen` for the initial
   state only). Folded into a disclosure at the foot of its own card:
   - Procedure Type detail — "Add a custom field" and "Add a control
     type" (the two separate add-cards are gone; 4 cards → 2). Open by
     default while that collection is still empty (guidance).
   - Surgery detail — "Record a control" (inside the Control history
     card) and "Assign a resident" (inside the Residents aside card).
   - Resident Surgery panel — "Record a control".
     Open by default when the relevant list is empty. One message key
     added (`surgeries.residents.assignAction`). Lint / format / web
     typecheck / 221 web tests green.
     **Follow-up:** `e2e/full-workflow.spec.ts` records a second control /
     assigns a resident after the first — those steps now need a
     `summary` click to expand the disclosure first. Update the spec when
     the suite is next run.
5. **DONE (2026-09-10).** Density pass:
   - Patient identity, Surgery summary and the resident meta card (all now
     in a narrow aside rail) drop `sm:grid-cols-2` → single-column
     `gap-3` tight rows.
   - Research Study fields — read view `gap-x-8 gap-y-4 lg:grid-cols-2`;
     **edit mode is now a 2×2 grid of textareas** (`rows={4}`) instead of
     four stacked, halving the form height (§4.4).
     Lint / format / web typecheck / 221 web tests green.
6. **DONE (2026-09-10).** `design-system.md` § Shape & spacing (two
   container widths) + § Layout primitives (`FormLayout`, `DetailGrid`,
   `Disclosure`) updated across steps 1–4. `ux-principles.md`: §1 (primary
   task in the main column, context/low-frequency actions to the aside or
   a `Disclosure`), §3 (container width by route intent; one `DetailGrid`
   layout for every detail screen), §6 (DOM source order primary-first,
   sticky aside can't cover focus, `Disclosure` stays keyboard-reachable),
   and a post-M10 note on the audit tracker.

---

**All six steps of the plan are implemented and merged into the working
tree** (uncommitted, awaiting the usual review/push). Independent
follow-ups still open: update `e2e/full-workflow.spec.ts` for the
`Disclosure`-folded forms (step 4 note); a real authenticated visual /
keyboard / sticky pass, which the code-level gate can't cover.

Each step is independently shippable and independently screenshot-able —
no big-bang layout rewrite.

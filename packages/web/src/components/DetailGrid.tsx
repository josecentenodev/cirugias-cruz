import type { ReactNode } from "react";

/**
 * The one detail-page layout: a wide **primary** work column and a
 * narrower **aside** for summary / metadata / low-frequency actions.
 * See `docs/design/desktop-space-usage.md` §3 P2.
 *
 * - `primary` comes first in the DOM — reading order and focus order
 *   follow the work, not the visual columns.
 * - The aside is `position: sticky` (and `align-self: start`, so the grid
 *   track doesn't stretch it to full height and defeat the stickiness),
 *   staying on screen while the primary column scrolls.
 * - Single column below `lg` (this app is desktop-first, but a narrow
 *   window must still render): the aside falls **below** the primary,
 *   since it is supporting context.
 *
 * Server Component — layout only, no interactivity.
 */
export function DetailGrid({ primary, aside }: { primary: ReactNode; aside: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] lg:gap-8">
      <div className="min-w-0">{primary}</div>
      <aside className="mt-6 lg:mt-0 lg:sticky lg:top-6 lg:self-start">{aside}</aside>
    </div>
  );
}

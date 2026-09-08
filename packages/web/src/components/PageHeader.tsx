import type { ReactNode } from "react";

/**
 * The one page-title treatment used across every screen — title +
 * optional one-line description + optional primary action (a CTA node,
 * usually a `<Link className={buttonVariants()}>`). Replaces the ad-hoc
 * `<div className="flex items-center justify-between"><h1/>…</div>`
 * repeated in every list/detail page. See docs/design/ux-principles.md
 * (§3 Consistent).
 *
 * `level` controls the heading element for correct document outline —
 * use `2` for a section header that sits under the page's own `<h1>`.
 */
export function PageHeader({
  title,
  description,
  action,
  level = 1,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <Heading className="text-lg font-semibold text-foreground">{title}</Heading>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

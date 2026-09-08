import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

/**
 * The ordered trail for nested routes (Patients → *patient* → Surgery →
 * *surgery*). Replaces the ad-hoc "← Back to X" links. The last crumb is
 * the current page and is never a link. See
 * docs/design/ux-principles.md (§3 Consistent, §5 Guidance).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {item.href && !isLast ? (
                  <Link href={item.href} className="transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={isLast ? "text-foreground" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {isLast ? null : (
                <li aria-hidden className="select-none">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

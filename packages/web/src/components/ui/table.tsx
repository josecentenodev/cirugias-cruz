import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-border bg-muted", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  // `relative` is always on so a row can host the stretched-link overlay
  // (see `stretchedLinkClass`); harmless for rows that don't use it.
  return <tr className={cn("relative hover:bg-muted/60", className)} {...props} />;
}

/**
 * Stretched-link pattern (see design-system.md § Table). The whole row
 * is one navigation target: put this class on the single real `<Link>`
 * / `<a>` inside a `<TableRow>`'s first cell. Its `::after` pseudo-
 * element is an absolutely-positioned overlay covering the (already
 * `relative`) row, so a click anywhere on the row activates the link.
 * Keyboard focus and screen-reader semantics stay on the real `<a>`.
 *
 * Any inline secondary control in the same row (delete button,
 * credential action) must carry `rowActionClass` so it renders above
 * the overlay and stays clickable and focusable.
 */
export const stretchedLinkClass =
  "after:absolute after:inset-0 after:content-[''] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm";

/** Lift an inline row control above the `stretchedLinkClass` overlay. */
export const rowActionClass = "relative z-10";

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-3 align-middle", className)} {...props} />;
}

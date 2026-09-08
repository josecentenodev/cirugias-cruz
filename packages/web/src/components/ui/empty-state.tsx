import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shown in place of a list/table when there is nothing yet. Gives the
 * user a one-line explanation and a way forward (the "provide guidance"
 * and "forgiving" principles — see docs/design/ux-principles.md).
 */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

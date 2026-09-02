import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** For inline, expectable error/empty messages — not for unexpected errors (those go through error.tsx). */
export function Alert({
  className,
  variant = "danger",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "danger" | "muted" }) {
  return (
    <div
      role={variant === "danger" ? "alert" : undefined}
      className={cn(
        "rounded-md border p-3 text-sm",
        variant === "danger" && "border-danger/30 bg-danger-bg text-danger",
        variant === "muted" && "border-border bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type AlertVariant = "danger" | "warning" | "success" | "muted";

const variantClasses: Record<AlertVariant, string> = {
  danger: "border-danger/30 bg-danger-bg text-danger",
  warning: "border-warning/30 bg-warning-bg text-warning-foreground",
  success: "border-success/30 bg-success-bg text-success",
  muted: "border-border bg-muted text-muted-foreground",
};

/** For inline, expectable error/empty messages — not for unexpected errors (those go through error.tsx). */
export function Alert({
  className,
  variant = "danger",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      role={variant === "danger" || variant === "warning" ? "alert" : undefined}
      className={cn("rounded-md border p-3 text-sm", variantClasses[variant], className)}
      {...props}
    />
  );
}

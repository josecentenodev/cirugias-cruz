import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        accent: "border-accent/30 bg-muted text-primary",
        success: "border-success/30 bg-success-bg text-success",
        warning: "border-warning/30 bg-warning-bg text-warning-foreground",
        danger: "border-danger/30 bg-danger-bg text-danger",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

/**
 * Small status pill — Research Study lifecycle (DRAFT / IN_PROGRESS /
 * COMPLETED), counts, and other at-a-glance state. See
 * docs/design/design-system.md.
 */
export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

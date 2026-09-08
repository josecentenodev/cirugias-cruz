import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { ResearchStudyStatus } from "../dtos";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Research-study lifecycle → Badge variant. DRAFT neutral, IN_PROGRESS accent, COMPLETED success. */
export const statusBadgeVariant: Record<ResearchStudyStatus, BadgeVariant> = {
  DRAFT: "neutral",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
};

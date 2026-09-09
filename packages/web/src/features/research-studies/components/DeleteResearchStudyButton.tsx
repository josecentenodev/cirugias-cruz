"use client";

import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { messages } from "@/messages/en";
import { deleteResearchStudyAction } from "../actions";

/**
 * Only rendered while `status === "DRAFT"` (`ResearchStudyDetail.tsx`) —
 * a presentation convenience; `api`'s own
 * `ResearchStudy.assertCanBeDeletedBy` remains the actual enforcement
 * (see `deleteResearchStudyAction`).
 *
 * A study has no short human name, so the type-to-confirm phrase is the
 * literal word `DELETE` (docs/design/design-system.md § two-tier
 * destructive confirmation).
 */
export function DeleteResearchStudyButton({ researchStudyId }: { researchStudyId: string }) {
  return (
    <DangerousConfirm
      action={deleteResearchStudyAction.bind(null, researchStudyId)}
      triggerLabel={messages.research.delete.label}
      confirmationPhrase={messages.common.deleteWord}
      confirmLabel={messages.common.delete}
      pendingLabel={messages.common.deleting}
      message={messages.research.delete.confirm}
    />
  );
}

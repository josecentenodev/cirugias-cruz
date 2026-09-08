"use client";

import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { messages } from "@/messages/en";
import { deleteResearchStudyAction } from "../actions";

/**
 * Only rendered while `status === "DRAFT"` (`ResearchStudyDetail.tsx`) —
 * a presentation convenience; `api`'s own
 * `ResearchStudy.assertCanBeDeletedBy` remains the actual enforcement
 * (see `deleteResearchStudyAction`).
 */
export function DeleteResearchStudyButton({ researchStudyId }: { researchStudyId: string }) {
  return (
    <ConfirmSubmit
      action={deleteResearchStudyAction.bind(null, researchStudyId)}
      triggerLabel={messages.research.delete.label}
      confirmLabel={messages.common.delete}
      pendingLabel={messages.common.deleting}
      message={messages.research.delete.confirm}
    />
  );
}

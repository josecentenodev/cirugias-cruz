"use client";

import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { messages } from "@/messages/en";
import { removeSurgeryFromStudyAction } from "../actions";

/**
 * Per-row remove of a Surgery from a study's universe. Data-destroying
 * (the study loses that Surgery from its analysis set with no undo), so
 * it is gated by type-to-confirm. A study row has no short name — the
 * confirmation phrase is the literal word `DELETE`.
 */
export function RemoveSurgeryButton({
  researchStudyId,
  surgeryId,
}: {
  researchStudyId: string;
  surgeryId: string;
}) {
  return (
    <DangerousConfirm
      action={removeSurgeryFromStudyAction.bind(null, researchStudyId, surgeryId)}
      triggerLabel={messages.common.remove}
      confirmationPhrase={messages.common.deleteWord}
      confirmLabel={messages.common.remove}
      pendingLabel={messages.common.removing}
      message={messages.research.surgeries.removeConfirm}
    />
  );
}

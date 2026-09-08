"use client";

import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { messages } from "@/messages/en";
import { removeSurgeryFromStudyAction } from "../actions";

/** Mirrors `RemoveResidentButton` — a per-row confirmed remove with its own inline error state. */
export function RemoveSurgeryButton({
  researchStudyId,
  surgeryId,
}: {
  researchStudyId: string;
  surgeryId: string;
}) {
  return (
    <ConfirmSubmit
      action={removeSurgeryFromStudyAction.bind(null, researchStudyId, surgeryId)}
      triggerLabel={messages.common.remove}
      confirmLabel={messages.common.remove}
      pendingLabel={messages.common.removing}
      message={messages.research.surgeries.removeConfirm}
    />
  );
}

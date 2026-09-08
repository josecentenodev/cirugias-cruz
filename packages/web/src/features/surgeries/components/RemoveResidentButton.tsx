"use client";

import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { messages } from "@/messages/en";
import { removeResidentAction } from "../actions";

/**
 * `api`'s own `Surgery.removeResident` rejects this once the resident
 * has recorded a Control on this surgery (ADR 0010's participation-
 * preservation rule) — that rejection surfaces inline via `ConfirmSubmit`,
 * next to this specific resident's row, never pre-guessed client-side.
 */
export function RemoveResidentButton({
  patientId,
  surgeryId,
  residentId,
  residentName,
}: {
  patientId: string;
  surgeryId: string;
  residentId: string;
  residentName: string;
}) {
  return (
    <ConfirmSubmit
      action={removeResidentAction.bind(null, patientId, surgeryId, residentId)}
      triggerLabel={messages.common.remove}
      confirmLabel={messages.common.remove}
      pendingLabel={messages.common.removing}
      message={messages.surgeries.residents.removeConfirm(residentName)}
    />
  );
}

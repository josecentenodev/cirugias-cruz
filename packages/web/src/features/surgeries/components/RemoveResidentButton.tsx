"use client";

import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { messages } from "@/messages/en";
import { removeResidentAction } from "../actions";

/**
 * `api`'s own `Surgery.removeResident` rejects this once the resident
 * has recorded a Control on this surgery (ADR 0010's participation-
 * preservation rule) — that rejection surfaces inline via
 * `DangerousConfirm`, next to this specific resident's row, never
 * pre-guessed client-side.
 *
 * Type-to-confirm gated (docs/design/ux-principles.md §4): the phrase is
 * the resident's own name.
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
    <DangerousConfirm
      action={removeResidentAction.bind(null, patientId, surgeryId, residentId)}
      triggerLabel={messages.common.remove}
      confirmationPhrase={residentName}
      confirmLabel={messages.common.remove}
      pendingLabel={messages.common.removing}
      message={messages.surgeries.residents.removeConfirm(residentName)}
    />
  );
}

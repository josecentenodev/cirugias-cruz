"use client";

import { ActionForm } from "@/components/ActionForm";
import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { resendResidentInvitationAction, setResidentActiveAction } from "../actions";

const c = messages.residents.credentials;

/**
 * Per-resident credential controls (ADR 0029): show invitation status,
 * resend the invitation, and deactivate/reactivate login. Lives on the
 * list row itself — this milestone has no dedicated Resident detail
 * page (see `features/residents/queries.ts`). Deactivating a login is
 * type-to-confirmed (it immediately ends the resident's session);
 * resending and reactivating are plain submits. Each control is its own
 * `ActionForm`, so their feedback never mixes; success is a toast and
 * the row refreshes in place (`revalidatePath`).
 */
export function ResidentCredentialActions({
  residentId,
  residentName,
  active,
  invitationAccepted,
}: {
  residentId: string;
  residentName: string;
  active: boolean;
  invitationAccepted: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs">{invitationAccepted ? c.invitationAccepted : c.invitationPending}</p>

      <div className="flex flex-wrap items-start gap-2">
        <ActionForm
          action={resendResidentInvitationAction.bind(null, residentId)}
          className="flex flex-col items-start gap-2"
        >
          <PendingButton variant="ghost" size="sm" pendingText={c.resendingInvitation}>
            {c.resendInvitation}
          </PendingButton>
        </ActionForm>

        {active ? (
          <DangerousConfirm
            action={setResidentActiveAction.bind(null, residentId, false)}
            triggerLabel={c.deactivate}
            confirmationPhrase={residentName}
            confirmLabel={c.deactivate}
            pendingLabel={messages.common.saving}
            message={c.deactivateConfirm(residentName)}
          />
        ) : (
          <ActionForm
            action={setResidentActiveAction.bind(null, residentId, true)}
            className="flex flex-col items-start gap-2"
          >
            <PendingButton variant="secondary" size="sm">
              {c.reactivate}
            </PendingButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}

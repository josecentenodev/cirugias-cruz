"use client";

import { useActionState } from "react";
import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { Alert } from "@/components/ui/alert";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import {
  resendResidentInvitationAction,
  setResidentActiveAction,
  type ResendInvitationFormState,
  type SetResidentActiveFormState,
} from "../actions";

const resendInitialState: ResendInvitationFormState = {};
const activeInitialState: SetResidentActiveFormState = {};

const c = messages.residents.credentials;

/**
 * Per-resident credential controls (ADR 0029): show invitation status,
 * resend the invitation, and deactivate/reactivate login. Lives on the
 * list row itself — this milestone has no dedicated Resident detail
 * page (see `features/residents/queries.ts`). Deactivating a login is
 * confirmed via `ConfirmSubmit` (it immediately ends the resident's
 * session); resending and reactivating are plain submits.
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
  const [resendState, resendAction] = useActionState(
    resendResidentInvitationAction.bind(null, residentId),
    resendInitialState,
  );
  const [activeState, activeAction] = useActionState(
    setResidentActiveAction.bind(null, residentId, true),
    activeInitialState,
  );

  return (
    <div className="flex flex-col gap-2">
      {resendState.error ? <Alert>{resendState.error}</Alert> : null}
      {activeState.error ? <Alert>{activeState.error}</Alert> : null}
      {activeState.succeededActive !== undefined ? (
        <Alert variant="success">
          {activeState.succeededActive ? c.reactivated : c.deactivated}
        </Alert>
      ) : null}

      {resendState.sent ? (
        <p className="text-xs">{c.invitationResent}</p>
      ) : (
        <p className="text-xs">{invitationAccepted ? c.invitationAccepted : c.invitationPending}</p>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <form action={resendAction}>
          <PendingButton variant="ghost" size="sm" pendingText={c.resendingInvitation}>
            {c.resendInvitation}
          </PendingButton>
        </form>

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
          <form action={activeAction}>
            <PendingButton variant="secondary" size="sm">
              {c.reactivate}
            </PendingButton>
          </form>
        )}
      </div>
    </div>
  );
}

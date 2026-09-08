"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { Alert } from "@/components/ui/alert";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import {
  resetResidentPasswordAction,
  setResidentActiveAction,
  viewResidentTemporaryPasswordAction,
  type ResetPasswordFormState,
  type SetResidentActiveFormState,
  type ViewTemporaryPasswordFormState,
} from "../actions";

const viewInitialState: ViewTemporaryPasswordFormState = {};
const resetInitialState: ResetPasswordFormState = {};
const activeInitialState: SetResidentActiveFormState = {};

const c = messages.residents.credentials;

/**
 * Per-resident credential controls (ADR 0017): view the temporary
 * password while it's still valid, reissue a new one ("blanqueo"), and
 * deactivate/reactivate login. Lives on the list row itself — this
 * milestone has no dedicated Resident detail page (see
 * `features/residents/queries.ts`). Deactivating a login is
 * confirmed via `ConfirmSubmit` (it immediately ends the resident's
 * session); viewing, reissuing (recoverable — just reissue again), and
 * reactivating are plain submits.
 */
export function ResidentCredentialActions({
  residentId,
  residentName,
  active,
}: {
  residentId: string;
  residentName: string;
  active: boolean;
}) {
  const [viewState, viewAction] = useActionState(
    viewResidentTemporaryPasswordAction.bind(null, residentId),
    viewInitialState,
  );
  const [resetState, resetAction] = useActionState(
    resetResidentPasswordAction.bind(null, residentId),
    resetInitialState,
  );
  const [activeState, activeAction] = useActionState(
    setResidentActiveAction.bind(null, residentId, true),
    activeInitialState,
  );

  return (
    <div className="flex flex-col gap-2">
      {viewState.error ? <Alert>{viewState.error}</Alert> : null}
      {resetState.error ? <Alert>{resetState.error}</Alert> : null}
      {activeState.error ? <Alert>{activeState.error}</Alert> : null}
      {activeState.succeededActive !== undefined ? (
        <Alert variant="success">
          {activeState.succeededActive ? c.reactivated : c.deactivated}
        </Alert>
      ) : null}

      {viewState.revealed ? (
        <p className="text-xs">
          {viewState.temporaryPassword ? (
            <>
              {c.tempPasswordLabel} <code className="font-mono">{viewState.temporaryPassword}</code>
            </>
          ) : (
            c.alreadyChanged
          )}
        </p>
      ) : null}
      {resetState.temporaryPassword ? (
        <p className="text-xs">
          {c.newTempPasswordLabel} <code className="font-mono">{resetState.temporaryPassword}</code>
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-2">
        <form action={viewAction}>
          <PendingButton variant="ghost" size="sm">
            {c.viewTempPassword}
          </PendingButton>
        </form>
        <form action={resetAction}>
          <PendingButton variant="ghost" size="sm" pendingText={messages.common.saving}>
            {c.resetPassword}
          </PendingButton>
        </form>

        {active ? (
          <ConfirmSubmit
            action={setResidentActiveAction.bind(null, residentId, false)}
            triggerLabel={c.deactivate}
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

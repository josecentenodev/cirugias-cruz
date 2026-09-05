"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

/**
 * Per-resident credential controls (ADR 0017): view the temporary
 * password while it's still valid, "blanqueo" (reissue a new one), and
 * deactivate/reactivate login. Lives on the list row itself — this
 * milestone has no dedicated Resident detail page (see
 * `features/residents/queries.ts`), and these are the only credential
 * actions ADR 0017 defines.
 *
 * `active` (from `GET /residents`) is used only to show the one
 * deactivate/reactivate button that applies — `api` itself is still what
 * actually enforces state either way.
 */
export function ResidentCredentialActions({
  residentId,
  active,
}: {
  residentId: string;
  active: boolean;
}) {
  const boundView = viewResidentTemporaryPasswordAction.bind(null, residentId);
  const [viewState, viewAction, viewPending] = useActionState(boundView, viewInitialState);

  const boundReset = resetResidentPasswordAction.bind(null, residentId);
  const [resetState, resetAction, resetPending] = useActionState(boundReset, resetInitialState);

  const boundSetActive = setResidentActiveAction.bind(null, residentId, !active);
  const [activeState, activeAction, activePending] = useActionState(
    boundSetActive,
    activeInitialState,
  );

  return (
    <div className="flex flex-col gap-2">
      {viewState.error ? <Alert>{viewState.error}</Alert> : null}
      {resetState.error ? <Alert>{resetState.error}</Alert> : null}
      {activeState.error ? <Alert>{activeState.error}</Alert> : null}
      {activeState.succeededActive !== undefined ? (
        <Alert variant="muted">
          {activeState.succeededActive ? "Resident reactivated." : "Resident deactivated."}
        </Alert>
      ) : null}

      {viewState.revealed ? (
        <p className="text-xs">
          {viewState.temporaryPassword ? (
            <>
              Temporary password: <code className="font-mono">{viewState.temporaryPassword}</code>
            </>
          ) : (
            "Already changed by the resident — nothing to show."
          )}
        </p>
      ) : null}
      {resetState.temporaryPassword ? (
        <p className="text-xs">
          New temporary password: <code className="font-mono">{resetState.temporaryPassword}</code>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form action={viewAction}>
          <Button type="submit" variant="ghost" size="sm" disabled={viewPending}>
            View temporary password
          </Button>
        </form>
        <form action={resetAction}>
          <Button type="submit" variant="ghost" size="sm" disabled={resetPending}>
            Reset password
          </Button>
        </form>
        <form action={activeAction}>
          <Button type="submit" variant="ghost" size="sm" disabled={activePending}>
            {active ? "Deactivate" : "Reactivate"}
          </Button>
        </form>
      </div>
    </div>
  );
}

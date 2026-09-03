"use client";

import { useActionState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  resetResidentPasswordAction,
  setResidentActiveAction,
  viewResidentTemporaryPasswordAction,
  type ResetPasswordFormState,
  type ViewTemporaryPasswordFormState,
} from "../actions";

const viewInitialState: ViewTemporaryPasswordFormState = {};
const resetInitialState: ResetPasswordFormState = {};

/**
 * Per-resident credential controls (ADR 0017): view the temporary
 * password while it's still valid, "blanqueo" (reissue a new one), and
 * deactivate/reactivate login. Lives on the list row itself — this
 * milestone has no dedicated Resident detail page (see
 * `features/residents/queries.ts`), and these are the only credential
 * actions ADR 0017 defines.
 *
 * Known simplification: the list doesn't currently know whether a
 * Resident is already active or deactivated (`GET /residents` doesn't
 * report it), so both actions are always offered rather than only the
 * one that applies — `api` itself is what actually enforces state
 * either way; this is a UX gap, not a security one.
 */
export function ResidentCredentialActions({ residentId }: { residentId: string }) {
  const boundView = viewResidentTemporaryPasswordAction.bind(null, residentId);
  const [viewState, viewAction, viewPending] = useActionState(boundView, viewInitialState);

  const boundReset = resetResidentPasswordAction.bind(null, residentId);
  const [resetState, resetAction, resetPending] = useActionState(boundReset, resetInitialState);

  const [isActivating, startActivating] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {viewState.error ? <Alert>{viewState.error}</Alert> : null}
      {resetState.error ? <Alert>{resetState.error}</Alert> : null}

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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isActivating}
          onClick={() => startActivating(() => setResidentActiveAction(residentId, false))}
        >
          Deactivate
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isActivating}
          onClick={() => startActivating(() => setResidentActiveAction(residentId, true))}
        >
          Reactivate
        </Button>
      </div>
    </div>
  );
}

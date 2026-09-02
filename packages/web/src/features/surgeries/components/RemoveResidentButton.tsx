"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { removeResidentAction, type RemoveResidentFormState } from "../actions";

const initialState: RemoveResidentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}

/**
 * `api`'s own `Surgery.removeResident` rejects this once the resident
 * has recorded a Control on this surgery (ADR 0010's participation-
 * preservation rule) — that rejection surfaces as `state.error`, shown
 * inline next to this specific resident's row, never pre-guessed
 * client-side by, say, checking whether that resident authored any
 * control in `controls`.
 */
export function RemoveResidentButton({
  surgeryId,
  residentId,
}: {
  surgeryId: string;
  residentId: string;
}) {
  const boundAction = removeResidentAction.bind(null, surgeryId, residentId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
      <SubmitButton />
    </form>
  );
}

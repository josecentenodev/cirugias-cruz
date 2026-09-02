"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { removeSurgeryFromStudyAction, type RemoveSurgeryFromStudyFormState } from "../actions";

const initialState: RemoveSurgeryFromStudyFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Removing…" : "Remove"}
    </Button>
  );
}

/** Mirrors `RemoveResidentButton` — a per-row form with its own inline error state. */
export function RemoveSurgeryButton({
  researchStudyId,
  surgeryId,
}: {
  researchStudyId: string;
  surgeryId: string;
}) {
  const boundAction = removeSurgeryFromStudyAction.bind(null, researchStudyId, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      {state.error ? <span className="text-xs text-danger">{state.error}</span> : null}
      <SubmitButton />
    </form>
  );
}

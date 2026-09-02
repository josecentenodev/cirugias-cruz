"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { deleteResearchStudyAction, type DeleteResearchStudyFormState } from "../actions";

const initialState: DeleteResearchStudyFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? "Deleting…" : "Delete study"}
    </Button>
  );
}

/**
 * Only rendered while `status === "DRAFT"` (`ResearchStudyDetail.tsx`) —
 * a presentation convenience; `api`'s own
 * `ResearchStudy.assertCanBeDeletedBy` remains the actual enforcement
 * (see `deleteResearchStudyAction`).
 */
export function DeleteResearchStudyButton({ researchStudyId }: { researchStudyId: string }) {
  const boundAction = deleteResearchStudyAction.bind(null, researchStudyId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton />
    </form>
  );
}

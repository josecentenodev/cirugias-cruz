"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  changeResearchStudyStatusAction,
  type ChangeResearchStudyStatusFormState,
} from "../actions";
import type { ResearchStudyStatus } from "../dtos";

const initialState: ChangeResearchStudyStatusFormState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

const TRANSITIONS: Record<
  ResearchStudyStatus,
  { target: ResearchStudyStatus; label: string; pendingLabel: string }
> = {
  DRAFT: { target: "IN_PROGRESS", label: "Start", pendingLabel: "Starting…" },
  IN_PROGRESS: { target: "COMPLETED", label: "Complete", pendingLabel: "Completing…" },
  COMPLETED: { target: "IN_PROGRESS", label: "Reopen", pendingLabel: "Reopening…" },
};

/**
 * Renders exactly one transition button for the study's *current* status
 * — never a free-form status picker. `api`'s own
 * `POST /research-studies/:id/status` route re-derives the current
 * status server-side and is the sole authority on which transition is
 * legal (see `changeResearchStudyStatusAction`'s own comment); this
 * component only offers the one transition that reaching each status
 * conventionally means next, purely as a UI affordance.
 */
export function StatusActions({
  researchStudyId,
  status,
}: {
  researchStudyId: string;
  status: ResearchStudyStatus;
}) {
  const { target, label, pendingLabel } = TRANSITIONS[status];
  const boundAction = changeResearchStudyStatusAction.bind(null, researchStudyId, target);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton label={label} pendingLabel={pendingLabel} />
    </form>
  );
}

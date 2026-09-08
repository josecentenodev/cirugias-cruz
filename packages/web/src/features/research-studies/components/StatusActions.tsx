"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import {
  changeResearchStudyStatusAction,
  type ChangeResearchStudyStatusFormState,
} from "../actions";
import type { ResearchStudyStatus } from "../dtos";

const initialState: ChangeResearchStudyStatusFormState = {};

const TRANSITIONS: Record<
  ResearchStudyStatus,
  { target: ResearchStudyStatus; label: string; pendingLabel: string }
> = {
  DRAFT: {
    target: "IN_PROGRESS",
    label: messages.research.transitions.start,
    pendingLabel: messages.research.transitions.starting,
  },
  IN_PROGRESS: {
    target: "COMPLETED",
    label: messages.research.transitions.complete,
    pendingLabel: messages.research.transitions.completing,
  },
  COMPLETED: {
    target: "IN_PROGRESS",
    label: messages.research.transitions.reopen,
    pendingLabel: messages.research.transitions.reopening,
  },
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
      <PendingButton size="sm" pendingText={pendingLabel}>
        {label}
      </PendingButton>
    </form>
  );
}

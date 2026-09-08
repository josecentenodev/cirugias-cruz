"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { addSurgeryToStudyAction, type AddSurgeryToStudyFormState } from "../actions";

const initialState: AddSurgeryToStudyFormState = {};

/**
 * `surgeries` is already filtered to exclude anyone already in the
 * study's universe (see `research-studies/[id]/page.tsx`) — mirrors
 * `AssignResidentForm`. `api`'s own `ResearchStudy.addSurgery` remains
 * the authority either way (adding an already-present surgery is a
 * no-op `Set.add`).
 */
export function AddSurgeryForm({
  researchStudyId,
  surgeries,
}: {
  researchStudyId: string;
  surgeries: { id: string; label: string }[];
}) {
  const boundAction = addSurgeryToStudyAction.bind(null, researchStudyId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (surgeries.length === 0) {
    return <p className="text-sm text-muted-foreground">{messages.research.surgeries.allAdded}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
      {state.error ? (
        <div className="sm:order-3 sm:w-full">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <select
        name="surgeryId"
        required
        defaultValue=""
        aria-label={messages.research.surgeries.selectLabel}
        className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="" disabled>
          {messages.research.surgeries.select}
        </option>
        {surgeries.map((surgery) => (
          <option key={surgery.id} value={surgery.id}>
            {surgery.label}
          </option>
        ))}
      </select>
      <PendingButton size="sm" pendingText={messages.research.surgeries.adding}>
        {messages.research.surgeries.add}
      </PendingButton>
    </form>
  );
}

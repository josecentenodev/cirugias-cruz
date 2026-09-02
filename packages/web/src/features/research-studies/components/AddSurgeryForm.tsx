"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { addSurgeryToStudyAction, type AddSurgeryToStudyFormState } from "../actions";

const initialState: AddSurgeryToStudyFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Adding…" : "Add"}
    </Button>
  );
}

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
    return (
      <p className="text-sm text-muted-foreground">
        Every registered surgery is already part of this study.
      </p>
    );
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
        aria-label="Surgery to add"
        className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="" disabled>
          Select a surgery
        </option>
        {surgeries.map((surgery) => (
          <option key={surgery.id} value={surgery.id}>
            {surgery.label}
          </option>
        ))}
      </select>
      <SubmitButton />
    </form>
  );
}

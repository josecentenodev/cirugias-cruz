"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { modifyControlAction, type ModifyControlFormState } from "../actions";
import type { ControlView } from "../mappers";

const initialState: ModifyControlFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/**
 * One Control's row on the Surgery detail view, with an inline
 * edit toggle — the local `isEditing` state is exactly the kind of
 * real interactivity that justifies a Client Component (see
 * docs/architecture/milestone-8-design.md §6); the surrounding list is
 * still rendered by a Server Component
 * (`SurgeryDetail.tsx`/`getSurgery`). A successful edit's Server Action
 * redirects back to this same page, which re-fetches — `isEditing`
 * naturally resets on that fresh render, no callback plumbing needed.
 */
export function ControlRow({ surgeryId, control }: { surgeryId: string; control: ControlView }) {
  const [isEditing, setIsEditing] = useState(false);
  const boundAction = modifyControlAction.bind(null, surgeryId, control.id);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (!isEditing) {
    return (
      <li className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {control.recordedAtLabel} — {control.authorLabel}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{control.observations}</p>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-border p-3">
      <form action={formAction} className="flex flex-col gap-3">
        {state.error ? <Alert>{state.error}</Alert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`observations-${control.id}`}>Observations</Label>
          <textarea
            id={`observations-${control.id}`}
            name="observations"
            rows={3}
            defaultValue={control.observations}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`recordedAt-${control.id}`}>Date &amp; time</Label>
          <input
            id={`recordedAt-${control.id}`}
            name="recordedAt"
            type="datetime-local"
            defaultValue={control.recordedAtInputValue}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex gap-2">
          <SubmitButton />
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </li>
  );
}

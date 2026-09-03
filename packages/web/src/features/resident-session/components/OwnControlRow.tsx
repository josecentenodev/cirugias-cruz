"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { modifyOwnControlAction, type ModifyOwnControlFormState } from "../actions";
import type { OwnControlView } from "../mappers";

const initialState: ModifyOwnControlFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

/**
 * Mirrors `features/surgeries/components/ControlRow.tsx`, but the Edit
 * button only appears when `control.isMine` — a Resident may edit only
 * a Control they themselves authored (ADR 0017). `api` enforces this
 * regardless; hiding the button for a Control that isn't theirs is a
 * UX nicety, not the security boundary itself.
 */
export function OwnControlRow({
  surgeryId,
  control,
}: {
  surgeryId: string;
  control: OwnControlView;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const boundAction = modifyOwnControlAction.bind(null, surgeryId, control.id);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (!isEditing) {
    return (
      <li className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {control.recordedAtLabel} — {control.authorLabel}
          </p>
          {control.isMine ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : null}
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

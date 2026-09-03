"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { recordOwnControlAction, type RecordOwnControlFormState } from "../actions";

const initialState: RecordOwnControlFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Recording…" : "Record control"}
    </Button>
  );
}

/** No author picker — unlike the Physician's `RecordControlForm`, a Resident is always recording as themselves (ADR 0017). */
export function RecordOwnControlForm({ surgeryId }: { surgeryId: string }) {
  const boundAction = recordOwnControlAction.bind(null, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observations">Observations</Label>
        <textarea
          id="observations"
          name="observations"
          required
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recordedAt">Date &amp; time</Label>
        <input
          id="recordedAt"
          name="recordedAt"
          type="datetime-local"
          required
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

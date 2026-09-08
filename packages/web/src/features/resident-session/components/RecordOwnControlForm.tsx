"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { CustomFieldValueInputs } from "@/features/procedure-types/components/CustomFieldValueInputs";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { messages } from "@/messages/en";
import { recordOwnControlAction, type RecordOwnControlFormState } from "../actions";

const initialState: RecordOwnControlFormState = {};

const fieldClassName =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** No author picker — unlike the Physician's `RecordControlForm`, a Resident is always recording as themselves (ADR 0017). */
export function RecordOwnControlForm({
  surgeryId,
  customFields,
}: {
  surgeryId: string;
  /** The Procedure Type's `CONTROL`-scoped CustomFields — same optional inputs the Physician's form renders. */
  customFields: CustomFieldDto[];
}) {
  const boundAction = recordOwnControlAction.bind(null, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observations">{messages.fields.observations}</Label>
        <textarea
          id="observations"
          name="observations"
          required
          rows={3}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recordedAt">{messages.fields.dateAndTime}</Label>
        <input
          id="recordedAt"
          name="recordedAt"
          type="datetime-local"
          required
          className={fieldClassName}
        />
      </div>

      <CustomFieldValueInputs fields={customFields} />

      <div>
        <PendingButton pendingText={messages.resident.recordControl.submitting}>
          {messages.resident.recordControl.submit}
        </PendingButton>
      </div>
    </form>
  );
}

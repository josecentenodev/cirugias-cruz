"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  controlTypeOptions = [],
}: {
  surgeryId: string;
  /** The Procedure Type's `CONTROL`-scoped CustomFields — same optional inputs the Physician's form renders. */
  customFields: CustomFieldDto[];
  /** The Procedure Type's control definitions (ADR 0026); `atLimit` set when a capped one is already complete on this Surgery. */
  controlTypeOptions?: { id: string; name: string; atLimit: boolean }[];
}) {
  const boundAction = recordOwnControlAction.bind(null, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [definitionId, setDefinitionId] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const selectedType = controlTypeOptions.find((option) => option.id === definitionId);
  const blockedByCap = Boolean(selectedType?.atLimit);

  function fillNow() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setRecordedAt(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `T${pad(now.getHours())}:${pad(now.getMinutes())}`,
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      {controlTypeOptions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="definitionId">{messages.surgeries.recordControl.controlType}</Label>
          <select
            id="definitionId"
            name="definitionId"
            value={definitionId}
            onChange={(event) => setDefinitionId(event.target.value)}
            className={fieldClassName}
          >
            <option value="">{messages.surgeries.recordControl.controlTypeNone}</option>
            {controlTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {blockedByCap ? (
            <p className="text-xs text-danger">
              {messages.surgeries.recordControl.atLimit(selectedType?.name ?? "")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observations">{messages.fields.observations}</Label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recordedAt">{messages.fields.dateAndTime}</Label>
        <div className="flex items-center gap-2">
          <input
            id="recordedAt"
            name="recordedAt"
            type="datetime-local"
            required
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
            className={fieldClassName}
          />
          <button
            type="button"
            onClick={fillNow}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {messages.surgeries.recordControl.now}
          </button>
        </div>
      </div>

      <CustomFieldValueInputs fields={customFields} />

      <div>
        {blockedByCap ? (
          <Button type="submit" disabled>
            {messages.resident.recordControl.submit}
          </Button>
        ) : (
          <PendingButton pendingText={messages.resident.recordControl.submitting}>
            {messages.resident.recordControl.submit}
          </PendingButton>
        )}
      </div>
    </form>
  );
}

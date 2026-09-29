"use client";

import { useState } from "react";
import { ActionForm, FormTextarea } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { CustomFieldValueInputs } from "@/features/procedure-types/components/CustomFieldValueInputs";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { messages } from "@/messages/en";
import { recordOwnControlAction } from "../actions";

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
  // Every ProcedureType has at least its seeded default control
  // definition (ADR 0030 — no ad-hoc controls), so pre-select it when
  // it's the only option.
  const [definitionId, setDefinitionId] = useState(
    controlTypeOptions.length === 1 ? (controlTypeOptions[0]?.id ?? "") : "",
  );
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
    <ActionForm
      action={recordOwnControlAction.bind(null, surgeryId)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="definitionId">{messages.surgeries.recordControl.controlType}</Label>
        <select
          id="definitionId"
          name="definitionId"
          required
          value={definitionId}
          onChange={(event) => setDefinitionId(event.target.value)}
          className={fieldClassName}
        >
          {definitionId ? null : (
            <option value="" disabled>
              {messages.surgeries.recordControl.selectControlType}
            </option>
          )}
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

      <FormTextarea name="observations" label={messages.fields.observations} />

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
    </ActionForm>
  );
}

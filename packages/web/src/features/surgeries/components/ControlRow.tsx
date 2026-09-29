"use client";

import { useState } from "react";
import { ActionForm, FormField, FormTextarea } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { modifyControlAction } from "../actions";
import type { ControlView } from "../mappers";

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
export function ControlRow({
  patientId,
  surgeryId,
  control,
}: {
  patientId: string;
  surgeryId: string;
  control: ControlView;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <li className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {control.recordedAtLabel} — {control.authorLabel}
          </p>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            {messages.common.edit}
          </Button>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm">{control.observations}</p>
        {control.customFieldValues.length > 0 ? (
          <dl className="mt-2 flex flex-col gap-0.5">
            {control.customFieldValues.map((value) => (
              <div key={value.definitionId} className="flex gap-1.5 text-xs">
                <dt className="text-muted-foreground">{value.label}:</dt>
                <dd>{value.displayValue}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </li>
    );
  }

  return (
    <li className="rounded-md border border-border p-3">
      <ActionForm
        action={modifyControlAction.bind(null, patientId, surgeryId, control.id)}
        className="flex flex-col gap-3"
      >
        <FormTextarea
          name="observations"
          label={messages.fields.observations}
          defaultValue={control.observations}
        />
        <FormField
          name="recordedAt"
          label={messages.fields.dateAndTime}
          type="datetime-local"
          defaultValue={control.recordedAtInputValue}
        />

        <div className="flex gap-2">
          <PendingButton size="sm" pendingText={messages.common.saving}>
            {messages.common.save}
          </PendingButton>
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
            {messages.common.cancel}
          </Button>
        </div>
      </ActionForm>
    </li>
  );
}

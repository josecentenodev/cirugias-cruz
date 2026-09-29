"use client";

import { useState } from "react";
import { ActionForm, FormField, FormTextarea } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { modifyOwnControlAction } from "../actions";
import type { OwnControlView } from "../mappers";

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

  if (!isEditing) {
    return (
      <li className="rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {control.recordedAtLabel} — {control.authorLabel}
          </p>
          {control.isMine ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {messages.common.edit}
            </Button>
          ) : null}
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
        action={modifyOwnControlAction.bind(null, surgeryId, control.id)}
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

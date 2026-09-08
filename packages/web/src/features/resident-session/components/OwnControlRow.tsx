"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { modifyOwnControlAction, type ModifyOwnControlFormState } from "../actions";
import type { OwnControlView } from "../mappers";

const initialState: ModifyOwnControlFormState = {};

const fieldClassName =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClassName =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
      <form action={formAction} className="flex flex-col gap-3">
        {state.error ? <Alert>{state.error}</Alert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`observations-${control.id}`}>{messages.fields.observations}</Label>
          <textarea
            id={`observations-${control.id}`}
            name="observations"
            rows={3}
            defaultValue={control.observations}
            className={textareaClassName}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`recordedAt-${control.id}`}>{messages.fields.dateAndTime}</Label>
          <input
            id={`recordedAt-${control.id}`}
            name="recordedAt"
            type="datetime-local"
            defaultValue={control.recordedAtInputValue}
            className={fieldClassName}
          />
        </div>

        <div className="flex gap-2">
          <PendingButton size="sm" pendingText={messages.common.saving}>
            {messages.common.save}
          </PendingButton>
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
            {messages.common.cancel}
          </Button>
        </div>
      </form>
    </li>
  );
}

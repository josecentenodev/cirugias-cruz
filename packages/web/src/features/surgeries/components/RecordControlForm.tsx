"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { CustomFieldValueInputs } from "@/features/procedure-types/components/CustomFieldValueInputs";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { messages } from "@/messages/en";
import { recordControlAction, type RecordControlFormState } from "../actions";
import type { ParticipantView } from "../mappers";

const initialState: RecordControlFormState = {};

const fieldClassName =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClassName =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * `participants` come straight from the Surgery aggregate
 * (`SurgeryDto.participatingResidentIds`, resolved to display names by
 * `toSurgeryDetailView` via `features/residents/queries.ts` — see
 * `[id]/page.tsx`) — the same roster `Surgery.recordControl`'s resident
 * branch checks server-side. This form does not let a physician type an
 * arbitrary residentId; the dropdown is populated only from residents
 * `api` already reports as currently participating, so a picker can
 * never offer a choice `api` would reject.
 */
export function RecordControlForm({
  patientId,
  surgeryId,
  participants,
  customFields,
}: {
  patientId: string;
  surgeryId: string;
  participants: ParticipantView[];
  /** The Procedure Type's `CONTROL`-scoped CustomFields — rendered as optional inputs, coerced/validated server-side. */
  customFields: CustomFieldDto[];
}) {
  const boundAction = recordControlAction.bind(null, patientId, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [authorType, setAuthorType] = useState<"physician" | "resident">("physician");
  const hasParticipants = participants.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">
          {messages.surgeries.recordControl.recordedBy}
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="authorType"
              value="physician"
              checked={authorType === "physician"}
              onChange={() => setAuthorType("physician")}
            />
            {messages.surgeries.recordControl.physicianOption}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="authorType"
              value="resident"
              disabled={!hasParticipants}
              checked={authorType === "resident"}
              onChange={() => setAuthorType("resident")}
            />
            {messages.surgeries.recordControl.residentOption}
            {hasParticipants ? null : (
              <span className="text-xs text-muted-foreground">
                {messages.surgeries.recordControl.noResidentsHint}
              </span>
            )}
          </label>
        </div>
      </fieldset>

      {authorType === "resident" && hasParticipants ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="residentId">{messages.surgeries.recordControl.resident}</Label>
          <select
            id="residentId"
            name="residentId"
            required
            defaultValue=""
            className={fieldClassName}
          >
            <option value="" disabled>
              {messages.surgeries.recordControl.selectResident}
            </option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observations">{messages.fields.observations}</Label>
        <textarea
          id="observations"
          name="observations"
          required
          rows={3}
          className={textareaClassName}
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
        <PendingButton pendingText={messages.surgeries.recordControl.submitting}>
          {messages.surgeries.recordControl.submit}
        </PendingButton>
      </div>
    </form>
  );
}

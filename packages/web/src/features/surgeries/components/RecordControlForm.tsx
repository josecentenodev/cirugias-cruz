"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  controlTypeOptions = [],
}: {
  patientId: string;
  surgeryId: string;
  participants: ParticipantView[];
  /** The Procedure Type's `CONTROL`-scoped CustomFields — rendered as optional inputs, coerced/validated server-side. */
  customFields: CustomFieldDto[];
  /** The Procedure Type's control definitions (ADR 0026); `atLimit` set when a capped one is already complete on this Surgery. */
  controlTypeOptions?: { id: string; name: string; atLimit: boolean }[];
}) {
  const boundAction = recordControlAction.bind(null, patientId, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [authorType, setAuthorType] = useState<"physician" | "resident">("physician");
  // Every ProcedureType has at least its seeded default control
  // definition (ADR 0030 — no ad-hoc controls), so pre-select it when
  // it's the only option; the physician still has to choose among
  // several.
  const [definitionId, setDefinitionId] = useState(
    controlTypeOptions.length === 1 ? (controlTypeOptions[0]?.id ?? "") : "",
  );
  const [recordedAt, setRecordedAt] = useState("");
  const hasParticipants = participants.length > 0;
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
        <textarea id="observations" name="observations" rows={3} className={textareaClassName} />
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
            {messages.surgeries.recordControl.submit}
          </Button>
        ) : (
          <PendingButton pendingText={messages.surgeries.recordControl.submitting}>
            {messages.surgeries.recordControl.submit}
          </PendingButton>
        )}
      </div>
    </form>
  );
}

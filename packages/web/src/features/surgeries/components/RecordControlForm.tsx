"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { recordControlAction, type RecordControlFormState } from "../actions";

const initialState: RecordControlFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Recording…" : "Record control"}
    </Button>
  );
}

/**
 * `participatingResidentIds` come straight from the Surgery aggregate
 * (`SurgeryDto.participatingResidentIds`) — the same roster
 * `Surgery.recordControl`'s resident branch checks server-side. This
 * form does not let a physician type an arbitrary residentId; the
 * dropdown is populated only from residents `api` already reports as
 * currently participating, so a picker can never offer a choice `api`
 * would reject. No resident *names* are shown yet — assigning a
 * Resident to a Surgery, and the Resident-name lookups that make more
 * than an id displayable, are the next vertical slice's own work (see
 * ROADMAP.md's Milestone 8 entry); until then this list is typically
 * empty and the "record as a resident" option stays disabled.
 */
export function RecordControlForm({
  surgeryId,
  participatingResidentIds,
}: {
  surgeryId: string;
  participatingResidentIds: string[];
}) {
  const boundAction = recordControlAction.bind(null, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [authorType, setAuthorType] = useState<"physician" | "resident">("physician");
  const hasParticipatingResidents = participatingResidentIds.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Recorded by</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="authorType"
              value="physician"
              checked={authorType === "physician"}
              onChange={() => setAuthorType("physician")}
            />
            You (physician)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="authorType"
              value="resident"
              disabled={!hasParticipatingResidents}
              checked={authorType === "resident"}
              onChange={() => setAuthorType("resident")}
            />
            A participating resident
            {hasParticipatingResidents ? null : (
              <span className="text-xs text-muted-foreground">
                (none currently assigned to this surgery)
              </span>
            )}
          </label>
        </div>
      </fieldset>

      {authorType === "resident" && hasParticipatingResidents ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="residentId">Resident</Label>
          <select
            id="residentId"
            name="residentId"
            required
            defaultValue=""
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Select a resident
            </option>
            {participatingResidentIds.map((residentId) => (
              <option key={residentId} value={residentId}>
                Resident {residentId.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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

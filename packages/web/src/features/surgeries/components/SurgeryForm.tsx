"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomFieldValueInputs } from "@/features/procedure-types/components/CustomFieldValueInputs";
import type { ProcedureTypeDto } from "@/features/procedure-types/dtos";
import { registerSurgeryAction, type RegisterSurgeryFormState } from "../actions";

const initialState: RegisterSurgeryFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register surgery"}
    </Button>
  );
}

const selectClassName =
  "h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The Patient is fixed by the route (`patients/[id]/surgeries/new`) and
 * passed as `patientId` — a Surgery is always registered from inside its
 * Patient (Milestone 10 IA), so there is no patient picker here.
 * `procedureTypes` is fetched server-side by the page (reusing
 * `features/procedure-types/queries.ts` — no new `api` call) and passed
 * in; this component only renders the selection, it never fetches.
 *
 * Selecting a Procedure Type reveals that type's `SURGERY`-scoped
 * CustomFields (`CustomFieldValueInputs`) — same "conditional JSX on
 * local state" technique `RecordControlForm` uses for `authorType`. The
 * Server Action re-fetches the Procedure Type to coerce/validate those
 * values; this form only shows the inputs.
 */
export function SurgeryForm({
  patientId,
  procedureTypes,
}: {
  patientId: string;
  procedureTypes: ProcedureTypeDto[];
}) {
  const [state, formAction] = useActionState(registerSurgeryAction, initialState);
  const [procedureTypeId, setProcedureTypeId] = useState("");

  const selected = procedureTypes.find((procedureType) => procedureType.id === procedureTypeId);
  const surgeryFields = (selected?.customFields ?? []).filter((field) => field.scope === "SURGERY");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <input type="hidden" name="patientId" value={patientId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="procedureTypeId">Procedure type</Label>
        <select
          id="procedureTypeId"
          name="procedureTypeId"
          required
          value={procedureTypeId}
          onChange={(event) => setProcedureTypeId(event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled>
            Select a procedure type
          </option>
          {procedureTypes.map((procedureType) => (
            <option key={procedureType.id} value={procedureType.id}>
              {procedureType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="performedAt">Performed date</Label>
        <Input id="performedAt" name="performedAt" type="date" required />
      </div>

      <CustomFieldValueInputs fields={surgeryFields} />

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

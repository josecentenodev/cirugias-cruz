"use client";

import { useState } from "react";
import { ActionForm, FormField, FormSelect } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { CustomFieldValueInputs } from "@/features/procedure-types/components/CustomFieldValueInputs";
import type { ProcedureTypeDto } from "@/features/procedure-types/dtos";
import { messages } from "@/messages/en";
import { registerSurgeryAction } from "../actions";

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
  const [procedureTypeId, setProcedureTypeId] = useState("");

  const selected = procedureTypes.find((procedureType) => procedureType.id === procedureTypeId);
  const surgeryFields = (selected?.customFields ?? []).filter((field) => field.scope === "SURGERY");

  return (
    <ActionForm action={registerSurgeryAction} className="flex flex-col gap-4">
      <input type="hidden" name="patientId" value={patientId} />

      <FormSelect
        name="procedureTypeId"
        label={messages.surgeries.procedureType}
        required
        value={procedureTypeId}
        onChange={(event) => setProcedureTypeId(event.target.value)}
      >
        <option value="" disabled>
          {messages.surgeries.selectProcedureType}
        </option>
        {procedureTypes.map((procedureType) => (
          <option key={procedureType.id} value={procedureType.id}>
            {procedureType.name}
          </option>
        ))}
      </FormSelect>

      <FormField name="performedAt" label={messages.surgeries.performedDate} type="date" required />

      <CustomFieldValueInputs fields={surgeryFields} />

      <div>
        <PendingButton pendingText={messages.surgeries.registering}>
          {messages.surgeries.register}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

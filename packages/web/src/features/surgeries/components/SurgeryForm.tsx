"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSurgeryAction, type RegisterSurgeryFormState } from "../actions";

const initialState: RegisterSurgeryFormState = {};

interface Option {
  id: string;
  label: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register surgery"}
    </Button>
  );
}

/**
 * `patients`/`procedureTypes` are fetched server-side by
 * `app/(dashboard)/surgeries/new/page.tsx` (reusing
 * `features/patients/queries.ts`/`features/procedure-types/queries.ts`
 * — no new `api` call introduced) and passed in as plain props; this
 * component only renders the selection, it never fetches.
 */
export function SurgeryForm({
  patients,
  procedureTypes,
}: {
  patients: Option[];
  procedureTypes: Option[];
}) {
  const [state, formAction] = useActionState(registerSurgeryAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="patientId">Patient</Label>
        <select
          id="patientId"
          name="patientId"
          required
          defaultValue=""
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Select a patient
          </option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="procedureTypeId">Procedure type</Label>
        <select
          id="procedureTypeId"
          name="procedureTypeId"
          required
          defaultValue=""
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Select a procedure type
          </option>
          {procedureTypes.map((procedureType) => (
            <option key={procedureType.id} value={procedureType.id}>
              {procedureType.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="performedAt">Performed date</Label>
        <Input id="performedAt" name="performedAt" type="date" required />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

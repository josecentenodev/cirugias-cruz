"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { assignResidentAction, type AssignResidentFormState } from "../actions";

const initialState: AssignResidentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Assigning…" : "Assign"}
    </Button>
  );
}

/**
 * `residents` is already filtered to exclude anyone currently
 * participating (see `SurgeryDetail.tsx`) — a physician can't pick
 * someone the dropdown never offers, though `api`'s own
 * `assignResidentToSurgery` remains the authority either way
 * (`Surgery.assignResident` is idempotent-safe regardless).
 *
 * `totalResidentCount` (the tenant's full Resident count, before that
 * filtering) distinguishes two different empty states that would
 * otherwise collapse into the same message: a tenant with zero
 * Residents registered at all, vs. one where every existing Resident is
 * already assigned to this Surgery.
 */
export function AssignResidentForm({
  surgeryId,
  residents,
  totalResidentCount,
}: {
  surgeryId: string;
  residents: { id: string; label: string }[];
  totalResidentCount: number;
}) {
  const boundAction = assignResidentAction.bind(null, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (residents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {totalResidentCount === 0
          ? "No residents registered yet — register one first."
          : "Every registered resident is already assigned."}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
      {state.error ? (
        <div className="sm:order-3 sm:w-full">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <select
        name="residentId"
        required
        defaultValue=""
        aria-label="Resident to assign"
        className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="" disabled>
          Select a resident
        </option>
        {residents.map((resident) => (
          <option key={resident.id} value={resident.id}>
            {resident.label}
          </option>
        ))}
      </select>
      <SubmitButton />
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { assignResidentAction, type AssignResidentFormState } from "../actions";

const initialState: AssignResidentFormState = {};

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
  patientId,
  surgeryId,
  residents,
  totalResidentCount,
}: {
  patientId: string;
  surgeryId: string;
  residents: { id: string; label: string }[];
  totalResidentCount: number;
}) {
  const boundAction = assignResidentAction.bind(null, patientId, surgeryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (residents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {totalResidentCount === 0
          ? messages.surgeries.residents.noneRegistered
          : messages.surgeries.residents.allAssigned}
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
        aria-label={messages.surgeries.residents.assignLabel}
        className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="" disabled>
          {messages.surgeries.residents.selectResident}
        </option>
        {residents.map((resident) => (
          <option key={resident.id} value={resident.id}>
            {resident.label}
          </option>
        ))}
      </select>
      <PendingButton size="sm" pendingText={messages.surgeries.residents.assigning}>
        {messages.surgeries.residents.assign}
      </PendingButton>
    </form>
  );
}

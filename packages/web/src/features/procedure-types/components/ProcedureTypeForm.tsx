"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerProcedureTypeAction, type RegisterProcedureTypeFormState } from "../actions";

const initialState: RegisterProcedureTypeFormState = {};

/**
 * The interactive shell around procedure type registration. Mirrors
 * `features/patients/components/PatientForm.tsx` — local state is
 * limited to the pending/error feedback `useActionState` gives for
 * free. Submission goes through `registerProcedureTypeAction` (a Server
 * Action), never a client-side `fetch`.
 */
export function ProcedureTypeForm() {
  const [state, formAction] = useActionState(registerProcedureTypeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{messages.fields.name}</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">{messages.fields.descriptionOptional}</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <PendingButton pendingText={messages.procedureTypes.registering}>
          {messages.procedureTypes.register}
        </PendingButton>
      </div>
    </form>
  );
}

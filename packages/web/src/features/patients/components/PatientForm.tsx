"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerPatientAction, type RegisterPatientFormState } from "../actions";

const initialState: RegisterPatientFormState = {};

/**
 * The interactive shell around patient registration — local state is
 * limited to the pending/error feedback `useActionState` already gives
 * for free. Submission goes through `registerPatientAction` (a Server
 * Action), never a client-side `fetch`. See
 * docs/architecture/milestone-8-design.md §6.
 */
export function PatientForm() {
  const [state, formAction] = useActionState(registerPatientAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label={messages.fields.firstName} required />
        <Field id="lastName" label={messages.fields.lastName} required />
        <Field id="phone" label={messages.fields.phone} required />
        <Field id="email" label={messages.fields.email} type="email" required />
        <Field id="dateOfBirth" label={messages.fields.dateOfBirth} type="date" required />
        <Field id="dni" label={messages.fields.dniOptional} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observations">{messages.fields.observationsOptional}</Label>
        <textarea
          id="observations"
          name="observations"
          rows={3}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <PendingButton pendingText={messages.patients.registering}>
          {messages.patients.register}
        </PendingButton>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} />
    </div>
  );
}

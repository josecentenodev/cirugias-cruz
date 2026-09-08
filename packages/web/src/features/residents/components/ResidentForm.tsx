"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerResidentAction, type RegisterResidentFormState } from "../actions";

const initialState: RegisterResidentFormState = {};

/** Mirrors `features/patients/components/PatientForm.tsx` (minus the observations field — Resident has none). */
export function ResidentForm() {
  const [state, formAction] = useActionState(registerResidentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="firstName"
          label={messages.fields.firstName}
          required
          defaultValue={state.values?.firstName}
        />
        <Field
          id="lastName"
          label={messages.fields.lastName}
          required
          defaultValue={state.values?.lastName}
        />
        <Field
          id="phone"
          label={messages.fields.phone}
          required
          defaultValue={state.values?.phone}
        />
        <Field
          id="email"
          label={messages.fields.email}
          type="email"
          required
          defaultValue={state.values?.email}
        />
        <Field
          id="dateOfBirth"
          label={messages.fields.dateOfBirth}
          type="date"
          required
          defaultValue={state.values?.dateOfBirth}
        />
      </div>

      <div>
        <PendingButton pendingText={messages.residents.registering}>
          {messages.residents.register}
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
  defaultValue,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

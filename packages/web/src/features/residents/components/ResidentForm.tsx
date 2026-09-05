"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerResidentAction, type RegisterResidentFormState } from "../actions";

const initialState: RegisterResidentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register resident"}
    </Button>
  );
}

/** Mirrors `features/patients/components/PatientForm.tsx` (minus the observations field — Resident has none). */
export function ResidentForm() {
  const [state, formAction] = useActionState(registerResidentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label="First name" required defaultValue={state.values?.firstName} />
        <Field id="lastName" label="Last name" required defaultValue={state.values?.lastName} />
        <Field id="phone" label="Phone" required defaultValue={state.values?.phone} />
        <Field id="email" label="Email" type="email" required defaultValue={state.values?.email} />
        <Field
          id="dateOfBirth"
          label="Date of birth"
          type="date"
          required
          defaultValue={state.values?.dateOfBirth}
        />
      </div>

      <div>
        <SubmitButton />
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

"use client";

import { ActionForm, FormField } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerResidentAction } from "../actions";

/** Mirrors `features/patients/components/PatientForm.tsx` (minus the observations field — Resident has none). */
export function ResidentForm() {
  return (
    <ActionForm action={registerResidentAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="firstName" label={messages.fields.firstName} required />
        <FormField name="lastName" label={messages.fields.lastName} required />
        <FormField name="phone" label={messages.fields.phone} required />
        <FormField name="email" label={messages.fields.email} type="email" required />
        <FormField name="dateOfBirth" label={messages.fields.dateOfBirth} type="date" required />
      </div>

      <div>
        <PendingButton pendingText={messages.residents.registering}>
          {messages.residents.register}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

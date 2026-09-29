"use client";

import { ActionForm, FormField, FormTextarea } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerPatientAction } from "../actions";

/**
 * Patient registration. Feedback (inline error, preserved values,
 * per-field errors, success toast) comes from `ActionForm` — this
 * component only lays out fields. Submission goes through
 * `registerPatientAction` (a Server Action), never a client-side
 * `fetch`. See docs/architecture/milestone-8-design.md §6.
 */
export function PatientForm() {
  return (
    <ActionForm action={registerPatientAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="firstName" label={messages.fields.firstName} required />
        <FormField name="lastName" label={messages.fields.lastName} required />
        <FormField name="dateOfBirth" label={messages.fields.dateOfBirth} type="date" required />
        <FormField name="dni" label={messages.fields.dniOptional} />
      </div>

      <FormTextarea name="observations" label={messages.fields.observationsOptional} />

      <div>
        <PendingButton pendingText={messages.patients.registering}>
          {messages.patients.register}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

"use client";

import { ActionForm, FieldError, FormField, useField } from "@/components/ActionForm";
import { Label } from "@/components/ui/label";
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

      <ObservationsField />

      <div>
        <PendingButton pendingText={messages.patients.registering}>
          {messages.patients.register}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

function ObservationsField() {
  const field = useField("observations");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.id}>{messages.fields.observationsOptional}</Label>
      <textarea
        {...field.inputProps}
        rows={3}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-danger"
      />
      <FieldError id={field.errorId} error={field.error} />
    </div>
  );
}

"use client";

import { ActionForm, FormField, FormTextarea } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerProcedureTypeAction } from "../actions";

/**
 * Procedure type registration. Mirrors `PatientForm.tsx` — feedback is
 * `ActionForm`'s job; submission goes through
 * `registerProcedureTypeAction` (a Server Action), never a client-side
 * `fetch`.
 */
export function ProcedureTypeForm() {
  return (
    <ActionForm action={registerProcedureTypeAction} className="flex flex-col gap-4">
      <FormField name="name" label={messages.fields.name} required />
      <FormTextarea name="description" label={messages.fields.descriptionOptional} rows={2} />

      <div>
        <PendingButton pendingText={messages.procedureTypes.registering}>
          {messages.procedureTypes.register}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

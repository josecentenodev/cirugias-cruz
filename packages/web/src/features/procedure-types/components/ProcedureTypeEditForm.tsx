"use client";

import { ActionForm, FormField, FormTextarea } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { modifyProcedureTypeAction } from "../actions";
import type { ProcedureTypeDetailView } from "../mappers";

/**
 * Edits an existing Procedure Type's own fields. Same layout as
 * `ProcedureTypeForm.tsx`, bound to `modifyProcedureTypeAction`.
 */
export function ProcedureTypeEditForm({
  procedureType,
}: {
  procedureType: ProcedureTypeDetailView;
}) {
  return (
    <ActionForm
      action={modifyProcedureTypeAction.bind(null, procedureType.id)}
      className="flex flex-col gap-4"
    >
      <FormField
        name="name"
        label={messages.fields.name}
        defaultValue={procedureType.name}
        required
      />
      <FormTextarea
        name="description"
        label={messages.fields.descriptionOptional}
        rows={2}
        defaultValue={procedureType.description}
      />

      <div>
        <PendingButton pendingText={messages.common.saving}>
          {messages.procedureTypes.editSubmit}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

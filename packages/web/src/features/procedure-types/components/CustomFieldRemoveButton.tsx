"use client";

import { DangerousConfirm } from "@/components/ui/DangerousConfirm";
import { messages } from "@/messages/en";
import { removeCustomFieldAction } from "../actions";

/**
 * Remove one CustomField definition (ADR 0027). `api` rejects it with 400
 * when the field already holds a value ("frozen"); the row disables this
 * entirely in that case (see `CustomFieldList`), and any residual
 * rejection still surfaces inline here.
 */
export function CustomFieldRemoveButton({
  procedureTypeId,
  fieldId,
  fieldName,
}: {
  procedureTypeId: string;
  fieldId: string;
  fieldName: string;
}) {
  return (
    <DangerousConfirm
      action={removeCustomFieldAction.bind(null, procedureTypeId, fieldId)}
      triggerLabel={messages.procedureTypes.customFields.remove}
      confirmationPhrase={fieldName}
      confirmLabel={messages.common.remove}
      pendingLabel={messages.common.removing}
      message={messages.procedureTypes.customFields.frozenHint}
    />
  );
}

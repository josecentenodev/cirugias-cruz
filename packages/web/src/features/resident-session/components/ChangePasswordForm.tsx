"use client";

import { ActionForm, FormField } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { changeOwnPasswordAction } from "../actions";

/** Used both for the mandatory first-login change and a later voluntary one — the form and the action are the same either way (ADR 0017). */
export function ChangePasswordForm() {
  return (
    <ActionForm action={changeOwnPasswordAction} className="flex flex-col gap-4">
      <FormField
        name="newPassword"
        label={messages.fields.newPassword}
        type="password"
        required
        autoComplete="new-password"
      />

      <PendingButton className="w-full" pendingText={messages.resident.changePassword.submitting}>
        {messages.resident.changePassword.submit}
      </PendingButton>
    </ActionForm>
  );
}

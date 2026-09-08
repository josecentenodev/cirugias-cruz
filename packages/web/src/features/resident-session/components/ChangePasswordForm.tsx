"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { changeOwnPasswordAction, type ChangePasswordFormState } from "../actions";

const initialState: ChangePasswordFormState = {};

/** Used both for the mandatory first-login change and a later voluntary one — the form and the action are the same either way (ADR 0017). */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">{messages.fields.newPassword}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      <PendingButton className="w-full" pendingText={messages.resident.changePassword.submitting}>
        {messages.resident.changePassword.submit}
      </PendingButton>
    </form>
  );
}

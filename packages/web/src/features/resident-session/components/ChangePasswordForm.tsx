"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPasswordAction, type ChangePasswordFormState } from "../actions";

const initialState: ChangePasswordFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

/** Used both for the mandatory first-login change and a later voluntary one — the form and the action are the same either way (ADR 0017). */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      <SubmitButton />
    </form>
  );
}

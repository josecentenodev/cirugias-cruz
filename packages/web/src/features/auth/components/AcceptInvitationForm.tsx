"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { acceptInvitationAction, type AcceptInvitationFormState } from "../actions";

/**
 * The form the resident invitation link's page renders (ADR 0029) — the
 * Resident sets their own password to accept it. Submission goes
 * through `acceptInvitationAction` (a Server Action) via React's native
 * `<form action>` binding, never a client-side `fetch` to `api`, same
 * as `LoginForm`/`RegisterForm`.
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const initialState: AcceptInvitationFormState = { token };
  const [state, formAction] = useActionState(acceptInvitationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <input type="hidden" name="token" value={state.token ?? token} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{messages.fields.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <PendingButton className="w-full" pendingText={messages.auth.acceptInvitation.submitting}>
        {messages.auth.acceptInvitation.submit}
      </PendingButton>
    </form>
  );
}

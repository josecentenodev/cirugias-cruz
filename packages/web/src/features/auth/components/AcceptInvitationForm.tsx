"use client";

import { ActionForm, FormField } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { acceptInvitationAction } from "../actions";

/**
 * The form the resident invitation link's page renders (ADR 0029) — the
 * Resident sets their own password to accept it. Submission goes
 * through `acceptInvitationAction` (a Server Action), never a
 * client-side `fetch` to `api`, same as `LoginForm`/`RegisterForm`.
 * The token comes from the page's URL on every render, so it is never
 * round-tripped through the action result.
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  return (
    <ActionForm action={acceptInvitationAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <FormField
        name="password"
        label={messages.fields.password}
        type="password"
        required
        autoComplete="new-password"
      />

      <PendingButton className="w-full" pendingText={messages.auth.acceptInvitation.submitting}>
        {messages.auth.acceptInvitation.submit}
      </PendingButton>
    </ActionForm>
  );
}

"use client";

import { ActionForm, FormField, useActionResult } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { loginAction, resendConfirmationAction } from "../actions";

/** ADR 0028: the confirmation gate returns this exact message — matched here only to decide whether to offer a resend, never to reword it. */
function looksLikeUnconfirmedEmail(message: string | undefined): boolean {
  return Boolean(message?.toLowerCase().includes("confirm your email"));
}

/**
 * The login form. Submission goes through `loginAction` (a Server
 * Action) via React's native `<form action>` binding — never a
 * client-side `fetch` to `api`. See
 * docs/architecture/milestone-8-design.md §5/§6.
 */
export function LoginForm() {
  return (
    <ActionForm
      action={loginAction}
      className="flex flex-col gap-4"
      afterForm={<ResendConfirmationPrompt />}
    >
      <FormField
        name="email"
        label={messages.fields.email}
        type="email"
        required
        autoComplete="username"
      />
      <FormField
        name="password"
        label={messages.fields.password}
        type="password"
        required
        autoComplete="current-password"
      />

      <PendingButton className="w-full" pendingText={messages.auth.login.submitting}>
        {messages.auth.login.submit}
      </PendingButton>
    </ActionForm>
  );
}

/**
 * Offered only after the login was rejected for an unconfirmed email.
 * Its own form, rendered after (never inside) the login `<form>` — HTML
 * doesn't allow nested forms. Its success toast is deliberately the same
 * whatever happened server-side (see `resendConfirmationAction`).
 */
function ResendConfirmationPrompt() {
  const result = useActionResult();
  if (result.status !== "error" || !looksLikeUnconfirmedEmail(result.message)) {
    return null;
  }
  return (
    <ActionForm
      action={resendConfirmationAction}
      className="mt-3 flex items-center justify-between gap-2 text-sm"
    >
      <input type="hidden" name="email" value={result.values?.email ?? ""} />
      <span className="text-muted-foreground">{messages.auth.resendConfirmation.prompt}</span>
      <PendingButton variant="ghost" pendingText={messages.auth.resendConfirmation.sending}>
        {messages.auth.resendConfirmation.button}
      </PendingButton>
    </ActionForm>
  );
}

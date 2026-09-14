"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import {
  loginAction,
  resendConfirmationAction,
  type LoginFormState,
  type ResendConfirmationFormState,
} from "../actions";

const initialState: LoginFormState = {};
const initialResendState: ResendConfirmationFormState = {};

/** ADR 0028: the confirmation gate returns this exact message — matched here only to decide whether to offer a resend, never to reword it. */
function looksLikeUnconfirmedEmail(error: string | undefined): boolean {
  return Boolean(error?.toLowerCase().includes("confirm your email"));
}

/**
 * The interactive shell around the login form. Submission goes through
 * `loginAction` (a Server Action) via React's native `<form action>`
 * binding — never a client-side `fetch` to `api`. See
 * docs/architecture/milestone-8-design.md §5/§6.
 */
export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [resendState, resendAction] = useActionState(resendConfirmationAction, initialResendState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate={false}>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {looksLikeUnconfirmedEmail(state.error) ? (
        resendState.sent ? (
          <Alert variant="muted">{messages.auth.resendConfirmation.sent}</Alert>
        ) : (
          <form action={resendAction} className="flex items-center justify-between gap-2 text-sm">
            <input type="hidden" name="email" value={state.values?.email ?? ""} />
            <span className="text-muted-foreground">{messages.auth.resendConfirmation.prompt}</span>
            <PendingButton variant="ghost" pendingText={messages.auth.resendConfirmation.sending}>
              {messages.auth.resendConfirmation.button}
            </PendingButton>
          </form>
        )
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{messages.fields.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state.values?.email ?? ""}
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{messages.fields.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <PendingButton className="w-full" pendingText={messages.auth.login.submitting}>
        {messages.auth.login.submit}
      </PendingButton>
    </form>
  );
}

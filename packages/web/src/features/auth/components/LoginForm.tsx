"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { loginAction, type LoginFormState } from "../actions";

const initialState: LoginFormState = {};

/**
 * The interactive shell around the login form. Submission goes through
 * `loginAction` (a Server Action) via React's native `<form action>`
 * binding — never a client-side `fetch` to `api`. See
 * docs/architecture/milestone-8-design.md §5/§6.
 */
export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate={false}>
      {state.error ? <Alert>{state.error}</Alert> : null}

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

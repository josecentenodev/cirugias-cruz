"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginFormState } from "../actions";

const initialState: LoginFormState = {};

function SubmitButton() {
  // Local interactive state (pending) is exactly the kind of thing that
  // justifies a Client Component per
  // docs/architecture/milestone-8-design.md §6 — nothing else here does.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <SubmitButton />
    </form>
  );
}

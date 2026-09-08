"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerAction, type RegisterFormState } from "../actions";

const initialState: RegisterFormState = {};

/**
 * Submits through `registerAction` (a Server Action) — never a
 * client-side `fetch` to `api`, same as `LoginForm`. On success the
 * physician lands on a "check your email" page, not the dashboard —
 * the account isn't usable until they confirm (ADR 0015).
 */
export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">{messages.fields.firstName}</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            autoComplete="given-name"
            defaultValue={state.values?.firstName ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">{messages.fields.lastName}</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            autoComplete="family-name"
            defaultValue={state.values?.lastName ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">{messages.fields.phone}</Label>
        <Input
          id="phone"
          name="phone"
          required
          autoComplete="tel"
          defaultValue={state.values?.phone ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{messages.fields.email}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state.values?.email ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dateOfBirth">{messages.fields.dateOfBirth}</Label>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          required
          autoComplete="bday"
          defaultValue={state.values?.dateOfBirth ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{messages.fields.password}</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
      </div>

      <PendingButton className="w-full" pendingText={messages.auth.signup.submitting}>
        {messages.auth.signup.submit}
      </PendingButton>
    </form>
  );
}

"use client";

import { ActionForm, FormField } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { registerAction } from "../actions";

/**
 * Submits through `registerAction` (a Server Action) — never a
 * client-side `fetch` to `api`, same as `LoginForm`. On success the
 * physician lands on a "check your email" page, not the dashboard —
 * the account isn't usable until they confirm (ADR 0015).
 */
export function RegisterForm() {
  return (
    <ActionForm action={registerAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          name="firstName"
          label={messages.fields.firstName}
          required
          autoComplete="given-name"
        />
        <FormField
          name="lastName"
          label={messages.fields.lastName}
          required
          autoComplete="family-name"
        />
      </div>

      <FormField name="phone" label={messages.fields.phone} required autoComplete="tel" />
      <FormField
        name="email"
        label={messages.fields.email}
        type="email"
        required
        autoComplete="username"
      />
      <FormField
        name="dateOfBirth"
        label={messages.fields.dateOfBirth}
        type="date"
        required
        autoComplete="bday"
      />
      <FormField
        name="password"
        label={messages.fields.password}
        type="password"
        required
        autoComplete="new-password"
      />

      <PendingButton className="w-full" pendingText={messages.auth.signup.submitting}>
        {messages.auth.signup.submit}
      </PendingButton>
    </ActionForm>
  );
}

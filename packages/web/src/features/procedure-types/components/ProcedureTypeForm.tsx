"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerProcedureTypeAction, type RegisterProcedureTypeFormState } from "../actions";

const initialState: RegisterProcedureTypeFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register procedure type"}
    </Button>
  );
}

/**
 * The interactive shell around procedure type registration. Mirrors
 * `features/patients/components/PatientForm.tsx` — local state is
 * limited to the pending/error feedback `useActionState` gives for
 * free. Submission goes through `registerProcedureTypeAction` (a Server
 * Action), never a client-side `fetch`.
 */
export function ProcedureTypeForm() {
  const [state, formAction] = useActionState(registerProcedureTypeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="technique">Technique (optional)</Label>
        <Input id="technique" name="technique" />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modifyProcedureTypeAction, type ModifyProcedureTypeFormState } from "../actions";
import type { ProcedureTypeDetailView } from "../mappers";

const initialState: ModifyProcedureTypeFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

/**
 * Edits an existing Procedure Type's own fields. Mirrors
 * `ProcedureTypeForm.tsx`'s layout, bound to `modifyProcedureTypeAction`
 * instead of `registerProcedureTypeAction` — same
 * bind-then-`useActionState` shape as
 * `features/surgeries/components/AssignResidentForm.tsx`.
 */
export function ProcedureTypeEditForm({
  procedureType,
}: {
  procedureType: ProcedureTypeDetailView;
}) {
  const boundAction = modifyProcedureTypeAction.bind(null, procedureType.id);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={procedureType.name} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={procedureType.description}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="technique">Technique (optional)</Label>
        <Input id="technique" name="technique" defaultValue={procedureType.technique} />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

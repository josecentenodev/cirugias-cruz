"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createResearchStudyAction, type CreateResearchStudyFormState } from "../actions";

const initialState: CreateResearchStudyFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registering…" : "Register study"}
    </Button>
  );
}

/**
 * Every field is optional at the Domain level — a study can be created
 * blank and filled in later (it starts `DRAFT`, fully modifiable). This
 * form imposes nothing stricter than that.
 */
export function ResearchStudyForm() {
  const [state, formAction] = useActionState(createResearchStudyAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hypothesis">Hypothesis</Label>
        <textarea
          id="hypothesis"
          name="hypothesis"
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="results">Results</Label>
        <textarea
          id="results"
          name="results"
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analysis">Analysis</Label>
        <textarea
          id="analysis"
          name="analysis"
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="conclusion">Conclusion</Label>
        <textarea
          id="conclusion"
          name="conclusion"
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

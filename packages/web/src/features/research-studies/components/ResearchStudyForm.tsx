"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { createResearchStudyAction, type CreateResearchStudyFormState } from "../actions";

const initialState: CreateResearchStudyFormState = {};

const textareaClassName =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
        <Label htmlFor="hypothesis">{messages.research.fields.hypothesis}</Label>
        <textarea id="hypothesis" name="hypothesis" rows={3} className={textareaClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="results">{messages.research.fields.results}</Label>
        <textarea id="results" name="results" rows={3} className={textareaClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analysis">{messages.research.fields.analysis}</Label>
        <textarea id="analysis" name="analysis" rows={3} className={textareaClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="conclusion">{messages.research.fields.conclusion}</Label>
        <textarea id="conclusion" name="conclusion" rows={3} className={textareaClassName} />
      </div>

      <div>
        <PendingButton pendingText={messages.research.registering}>
          {messages.research.register}
        </PendingButton>
      </div>
    </form>
  );
}

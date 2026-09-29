"use client";

import { ActionForm, FormTextarea } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { createResearchStudyAction } from "../actions";

/**
 * Every field is optional at the Domain level — a study can be created
 * blank and filled in later (it starts `DRAFT`, fully modifiable). This
 * form imposes nothing stricter than that.
 */
export function ResearchStudyForm() {
  const f = messages.research.fields;
  return (
    <ActionForm action={createResearchStudyAction} className="flex flex-col gap-4">
      <FormTextarea name="hypothesis" label={f.hypothesis} />
      <FormTextarea name="results" label={f.results} />
      <FormTextarea name="analysis" label={f.analysis} />
      <FormTextarea name="conclusion" label={f.conclusion} />

      <div>
        <PendingButton pendingText={messages.research.registering}>
          {messages.research.register}
        </PendingButton>
      </div>
    </ActionForm>
  );
}

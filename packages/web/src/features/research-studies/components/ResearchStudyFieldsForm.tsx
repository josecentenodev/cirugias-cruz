"use client";

import { useState } from "react";
import { ActionForm, FormTextarea } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { updateResearchStudyAction } from "../actions";
import type { ResearchStudyDetailView } from "../mappers";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">
        {value || <span className="text-muted-foreground">{messages.common.none}</span>}
      </dd>
    </div>
  );
}

/**
 * Inline edit toggle over hypothesis/results/analysis/conclusion — the
 * local `isEditing` state is the same real interactivity that justifies
 * `ControlRow`'s Client Component; a successful save redirects back to
 * this same page, which re-fetches, naturally resetting `isEditing`.
 * The "Edit" button is hidden once `COMPLETED` — a presentation
 * convenience only; `api`'s own `assertModifiable` remains the actual
 * enforcement (see `updateResearchStudyAction`).
 */
export function ResearchStudyFieldsForm({ study }: { study: ResearchStudyDetailView }) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
          <Field label={messages.research.fields.hypothesis} value={study.hypothesis} />
          <Field label={messages.research.fields.results} value={study.results} />
          <Field label={messages.research.fields.analysis} value={study.analysis} />
          <Field label={messages.research.fields.conclusion} value={study.conclusion} />
        </dl>
        {study.status !== "COMPLETED" ? (
          <div>
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              {messages.common.edit}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const f = messages.research.fields;
  return (
    <ActionForm
      action={updateResearchStudyAction.bind(null, study.id)}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        <FormTextarea
          name="hypothesis"
          label={f.hypothesis}
          rows={4}
          defaultValue={study.hypothesis}
        />
        <FormTextarea name="results" label={f.results} rows={4} defaultValue={study.results} />
        <FormTextarea name="analysis" label={f.analysis} rows={4} defaultValue={study.analysis} />
        <FormTextarea
          name="conclusion"
          label={f.conclusion}
          rows={4}
          defaultValue={study.conclusion}
        />
      </div>

      <div className="flex gap-2">
        <PendingButton size="sm" pendingText={messages.common.saving}>
          {messages.common.save}
        </PendingButton>
        <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
          {messages.common.cancel}
        </Button>
      </div>
    </ActionForm>
  );
}

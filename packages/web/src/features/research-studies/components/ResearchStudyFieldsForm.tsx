"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateResearchStudyAction, type UpdateResearchStudyFormState } from "../actions";
import type { ResearchStudyDetailView } from "../mappers";

const initialState: UpdateResearchStudyFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">
        {value || <span className="text-muted-foreground">—</span>}
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
  const boundAction = updateResearchStudyAction.bind(null, study.id);
  const [state, formAction] = useActionState(boundAction, initialState);

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Hypothesis" value={study.hypothesis} />
          <Field label="Results" value={study.results} />
          <Field label="Analysis" value={study.analysis} />
          <Field label="Conclusion" value={study.conclusion} />
        </dl>
        {study.status !== "COMPLETED" ? (
          <div>
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hypothesis">Hypothesis</Label>
        <textarea
          id="hypothesis"
          name="hypothesis"
          rows={3}
          defaultValue={study.hypothesis}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="results">Results</Label>
        <textarea
          id="results"
          name="results"
          rows={3}
          defaultValue={study.results}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analysis">Analysis</Label>
        <textarea
          id="analysis"
          name="analysis"
          rows={3}
          defaultValue={study.analysis}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="conclusion">Conclusion</Label>
        <textarea
          id="conclusion"
          name="conclusion"
          rows={3}
          defaultValue={study.conclusion}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

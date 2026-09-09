"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import {
  addControlDefinitionAction,
  editControlDefinitionAction,
  type ControlDefinitionFormState,
} from "../actions";
import type { ControlDefinitionView } from "../mappers";

const initialState: ControlDefinitionFormState = {};

const fieldClassName =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Add or edit one control definition (ADR 0026). The `capped`/`uncapped`
 * toggle reveals the count + period inputs. `api` stays the authority on
 * name-uniqueness and the ADR 0027 freeze rule — a rejected edit surfaces
 * its message inline here.
 */
export function ControlDefinitionForm({
  procedureTypeId,
  definition,
  onDone,
}: {
  procedureTypeId: string;
  /** Present when editing an existing definition; absent when adding. */
  definition?: ControlDefinitionView;
  onDone?: () => void;
}) {
  const c = messages.procedureTypes.controlDefinitions;
  const boundAction = definition
    ? editControlDefinitionAction.bind(null, procedureTypeId, definition.id)
    : addControlDefinitionAction.bind(null, procedureTypeId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [mode, setMode] = useState<"uncapped" | "capped">(definition?.mode ?? "uncapped");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cd-name">{c.nameLabel}</Label>
        <input
          id="cd-name"
          name="name"
          required
          defaultValue={definition?.name ?? ""}
          className={fieldClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cd-mode">{c.modeLabel}</Label>
        <select
          id="cd-mode"
          name="mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as "uncapped" | "capped")}
          className={fieldClassName}
        >
          <option value="uncapped">{c.modeUncapped}</option>
          <option value="capped">{c.modeCapped}</option>
        </select>
      </div>

      {mode === "capped" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-count">{c.countLabel}</Label>
            <input
              id="cd-count"
              name="count"
              type="number"
              min={1}
              required
              defaultValue={definition?.count ?? ""}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-every">{c.everyLabel}</Label>
            <input
              id="cd-every"
              name="every"
              type="number"
              min={1}
              required
              defaultValue={definition?.periodEvery ?? ""}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-unit">{c.unitLabel}</Label>
            <select
              id="cd-unit"
              name="unit"
              defaultValue={definition?.periodUnit ?? "hours"}
              className={fieldClassName}
            >
              <option value="hours">{c.unitHours}</option>
              <option value="days">{c.unitDays}</option>
              <option value="weeks">{c.unitWeeks}</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <PendingButton pendingText={c.adding}>
          {definition ? c.editSubmit : c.addSubmit}
        </PendingButton>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-muted-foreground underline"
          >
            {messages.common.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

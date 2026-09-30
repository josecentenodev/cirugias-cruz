"use client";

import { useState } from "react";
import { ActionForm, FormField, FormSelect } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { addControlDefinitionAction, editControlDefinitionAction } from "../actions";
import type { ControlDefinitionView } from "../mappers";

type Mode = ControlDefinitionView["mode"];

/**
 * Add or edit one control definition (ADR 0026). The recording-cap select
 * reveals the count + period inputs (`capped`) or the explicit timepoints
 * + unit inputs (`scheduled`, ADR 0031 — e.g. days 1, 3 and 7). `api` stays the authority on
 * name-uniqueness and the ADR 0027 freeze rule — a rejected edit surfaces
 * its message inline (`ActionForm`).
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
  const action = definition
    ? editControlDefinitionAction.bind(null, procedureTypeId, definition.id)
    : addControlDefinitionAction.bind(null, procedureTypeId);
  const [mode, setMode] = useState<Mode>(definition?.mode ?? "uncapped");

  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField name="name" label={c.nameLabel} required defaultValue={definition?.name} />

        <FormSelect
          name="mode"
          label={c.modeLabel}
          value={mode}
          onChange={(event) => setMode(event.target.value as Mode)}
        >
          <option value="uncapped">{c.modeUncapped}</option>
          <option value="capped">{c.modeCapped}</option>
          <option value="scheduled">{c.modeScheduled}</option>
        </FormSelect>
      </div>

      {mode === "capped" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            name="count"
            label={c.countLabel}
            type="number"
            min={1}
            required
            defaultValue={definition?.count}
          />
          <FormField
            name="every"
            label={c.everyLabel}
            type="number"
            min={1}
            required
            defaultValue={definition?.periodEvery}
          />
          <FormSelect
            name="unit"
            label={c.unitLabel}
            defaultValue={definition?.periodUnit ?? "hours"}
          >
            <option value="hours">{c.unitHours}</option>
            <option value="days">{c.unitDays}</option>
            <option value="weeks">{c.unitWeeks}</option>
          </FormSelect>
        </div>
      ) : null}

      {mode === "scheduled" ? (
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <FormField
            name="timepoints"
            label={c.timepointsLabel}
            placeholder={c.timepointsPlaceholder}
            hint={c.timepointsHint}
            inputMode="numeric"
            required
            defaultValue={definition?.timepoints}
          />
          <FormSelect
            name="unit"
            label={c.timepointsUnitLabel}
            defaultValue={definition?.mode === "scheduled" ? definition.periodUnit : "days"}
          >
            <option value="hours">{c.unitHours}</option>
            <option value="days">{c.unitDays}</option>
            <option value="weeks">{c.unitWeeks}</option>
          </FormSelect>
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
    </ActionForm>
  );
}

"use client";

import { useState } from "react";
import { ActionForm, FormField, FormSelect, FormTextarea } from "@/components/ActionForm";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { addCustomFieldAction, editCustomFieldAction } from "../actions";
import type { CustomFieldView } from "../mappers";

type ValueType = "NUMBER" | "ENUM" | "TEXT";

/**
 * Defines a new CustomField on a Procedure Type (ADR 0018), or edits an
 * existing, not-yet-used one in place (ADR 0027 — passing `field` binds
 * to `editCustomFieldAction` instead, mirroring `ControlDefinitionForm`'s
 * own add/edit duality). `valueType` drives which constraint inputs
 * render — plain conditional JSX on local `useState`; no generic
 * dynamic-schema-form abstraction is introduced for three branches.
 * DATE is intentionally not offered here — see `schemas.ts`'s
 * `addCustomFieldSchema` comment for why. Feedback is `ActionForm`'s job.
 */
export function CustomFieldForm({
  procedureTypeId,
  field,
  onDone,
}: {
  procedureTypeId: string;
  /** Present when editing an existing, unused field; absent when adding. */
  field?: CustomFieldView;
  onDone?: () => void;
}) {
  const action = field
    ? editCustomFieldAction.bind(null, procedureTypeId, field.id)
    : addCustomFieldAction.bind(null, procedureTypeId);
  const [valueType, setValueType] = useState<ValueType>(field?.editable.valueType ?? "NUMBER");
  const c = messages.procedureTypes.customFields;

  return (
    <ActionForm action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField name="name" label={messages.fields.name} required defaultValue={field?.name} />

        <FormSelect
          name="scope"
          label={c.recordedOn}
          required
          defaultValue={field?.scope ?? "SURGERY"}
        >
          <option value="SURGERY">{c.scopeSurgery}</option>
          <option value="CONTROL">{c.scopeControl}</option>
        </FormSelect>

        <FormSelect
          name="valueType"
          label={c.valueType}
          required
          value={valueType}
          onChange={(event) => setValueType(event.target.value as ValueType)}
        >
          <option value="NUMBER">{c.valueTypeNumber}</option>
          <option value="ENUM">{c.valueTypeEnum}</option>
          <option value="TEXT">{c.valueTypeText}</option>
        </FormSelect>
      </div>

      <FormTextarea
        name="description"
        label={messages.fields.descriptionOptional}
        rows={2}
        defaultValue={field?.editable.description}
      />

      {valueType === "NUMBER" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            name="unit"
            label={c.unitOptional}
            placeholder={c.unitPlaceholder}
            defaultValue={field?.editable.unit}
          />
          <FormField
            name="min"
            label={c.minOptional}
            type="number"
            step="any"
            defaultValue={field?.editable.min}
          />
          <FormField
            name="max"
            label={c.maxOptional}
            type="number"
            step="any"
            defaultValue={field?.editable.max}
          />
        </div>
      ) : null}

      {valueType === "ENUM" ? (
        <FormTextarea
          name="options"
          label={c.optionsLabel}
          required
          rows={3}
          defaultValue={field?.editable.options?.join("\n")}
        />
      ) : null}

      {valueType === "TEXT" ? (
        <FormField
          name="maxLength"
          label={c.maxLengthOptional}
          type="number"
          step="1"
          min="1"
          defaultValue={field?.editable.maxLength}
        />
      ) : null}

      <div className="flex gap-2">
        <PendingButton pendingText={c.adding}>{field ? c.editSubmit : c.addSubmit}</PendingButton>
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

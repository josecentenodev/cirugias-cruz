"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { messages } from "@/messages/en";
import { addCustomFieldAction, type AddCustomFieldFormState } from "../actions";

const initialState: AddCustomFieldFormState = {};

type ValueType = "NUMBER" | "ENUM" | "TEXT";

const selectClassName =
  "h-9 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClassName =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Defines a new CustomField on a Procedure Type (ADR 0018). `valueType`
 * drives which constraint inputs render — plain conditional JSX on
 * local `useState`, same technique
 * `features/surgeries/components/RecordControlForm.tsx` already uses for
 * `authorType`; no generic dynamic-schema-form abstraction is
 * introduced for three branches. DATE is intentionally not offered here
 * — see `schemas.ts`'s `addCustomFieldSchema` comment for why.
 */
export function CustomFieldForm({ procedureTypeId }: { procedureTypeId: string }) {
  const boundAction = addCustomFieldAction.bind(null, procedureTypeId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [valueType, setValueType] = useState<ValueType>("NUMBER");
  const c = messages.procedureTypes.customFields;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{messages.fields.name}</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">{messages.fields.descriptionOptional}</Label>
        <textarea id="description" name="description" rows={2} className={textareaClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scope">{c.recordedOn}</Label>
        <select id="scope" name="scope" required defaultValue="SURGERY" className={selectClassName}>
          <option value="SURGERY">{c.scopeSurgery}</option>
          <option value="CONTROL">{c.scopeControl}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="valueType">{c.valueType}</Label>
        <select
          id="valueType"
          name="valueType"
          required
          value={valueType}
          onChange={(event) => setValueType(event.target.value as ValueType)}
          className={selectClassName}
        >
          <option value="NUMBER">{c.valueTypeNumber}</option>
          <option value="ENUM">{c.valueTypeEnum}</option>
          <option value="TEXT">{c.valueTypeText}</option>
        </select>
      </div>

      {valueType === "NUMBER" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">{c.unitOptional}</Label>
            <Input id="unit" name="unit" placeholder={c.unitPlaceholder} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min">{c.minOptional}</Label>
              <Input id="min" name="min" type="number" step="any" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max">{c.maxOptional}</Label>
              <Input id="max" name="max" type="number" step="any" />
            </div>
          </div>
        </>
      ) : null}

      {valueType === "ENUM" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="options">{c.optionsLabel}</Label>
          <textarea id="options" name="options" required rows={3} className={textareaClassName} />
        </div>
      ) : null}

      {valueType === "TEXT" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxLength">{c.maxLengthOptional}</Label>
          <Input id="maxLength" name="maxLength" type="number" step="1" min="1" />
        </div>
      ) : null}

      <div>
        <PendingButton pendingText={c.adding}>{c.addSubmit}</PendingButton>
      </div>
    </form>
  );
}

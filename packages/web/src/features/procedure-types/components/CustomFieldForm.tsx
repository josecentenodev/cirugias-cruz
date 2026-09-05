"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCustomFieldAction, type AddCustomFieldFormState } from "../actions";

const initialState: AddCustomFieldFormState = {};

type ValueType = "NUMBER" | "ENUM" | "TEXT";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add custom field"}
    </Button>
  );
}

const selectClassName =
  "h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scope">Recorded on</Label>
        <select id="scope" name="scope" required defaultValue="SURGERY" className={selectClassName}>
          <option value="SURGERY">The surgery itself (once)</option>
          <option value="CONTROL">Each control (repeated over time)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="valueType">Value type</Label>
        <select
          id="valueType"
          name="valueType"
          required
          value={valueType}
          onChange={(event) => setValueType(event.target.value as ValueType)}
          className={selectClassName}
        >
          <option value="NUMBER">Number</option>
          <option value="ENUM">One of a fixed list of options</option>
          <option value="TEXT">Free text</option>
        </select>
      </div>

      {valueType === "NUMBER" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input id="unit" name="unit" placeholder="e.g. mmHg, 0-10" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min">Minimum (optional)</Label>
              <Input id="min" name="min" type="number" step="any" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max">Maximum (optional)</Label>
              <Input id="max" name="max" type="number" step="any" />
            </div>
          </div>
        </>
      ) : null}

      {valueType === "ENUM" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="options">Options (one per line)</Label>
          <textarea
            id="options"
            name="options"
            required
            rows={3}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ) : null}

      {valueType === "TEXT" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxLength">Maximum length (optional)</Label>
          <Input id="maxLength" name="maxLength" type="number" step="1" min="1" />
        </div>
      ) : null}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomFieldDto } from "../dtos";
import { CUSTOM_FIELD_NAME_PREFIX } from "../custom-field-values";

const selectClassName =
  "h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Renders one input per physician-defined CustomField, driven entirely by
 * the definitions passed in (already scope-filtered by the caller). This
 * is the whole point of the mechanism: the physician defines the fields
 * they need on a Procedure Type, and they show up here on the Surgery /
 * Control forms with no code change.
 *
 * Every field is optional — no `required` — matching ADR 0018 (mandatory
 * CONTROL-scoped fields are explicitly deferred). Inputs are named
 * `customField:<id>`; `collectCustomFieldValues` reads them back and
 * coerces by `valueType`. All constraint enforcement stays server-side
 * in `api` (`validateCustomFieldValues`); the `min`/`max`/`maxLength`
 * attributes here are only a first-pass hint to the browser.
 */
export function CustomFieldValueInputs({ fields }: { fields: CustomFieldDto[] }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      {fields.map((field) => {
        const name = `${CUSTOM_FIELD_NAME_PREFIX}${field.id}`;
        const unit =
          field.constraint.valueType === "NUMBER" && field.constraint.unit
            ? ` (${field.constraint.unit})`
            : "";
        return (
          <div key={field.id} className="flex flex-col gap-1.5">
            <Label htmlFor={name}>
              {field.name}
              {unit}
            </Label>
            <FieldControl field={field} name={name} />
            {field.description ? (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FieldControl({ field, name }: { field: CustomFieldDto; name: string }) {
  const constraint = field.constraint;

  if (constraint.valueType === "NUMBER") {
    return (
      <Input
        id={name}
        name={name}
        type="number"
        step="any"
        min={constraint.min}
        max={constraint.max}
      />
    );
  }

  if (constraint.valueType === "ENUM") {
    return (
      <select id={name} name={name} defaultValue="" className={selectClassName}>
        <option value="">—</option>
        {constraint.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return <Input id={name} name={name} type="text" maxLength={constraint.maxLength} />;
}

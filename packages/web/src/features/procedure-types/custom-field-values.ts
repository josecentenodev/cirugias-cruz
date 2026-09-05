import type { CustomFieldDto } from "./dtos";

/** One recorded value, shaped exactly as `api`'s `customFieldValues[]` entries expect. */
export interface CollectedCustomFieldValue {
  definitionId: string;
  value: string | number;
}

/** Form field name for a CustomField value input: `customField:<definitionId>`. */
export const CUSTOM_FIELD_NAME_PREFIX = "customField:";

/**
 * Whether a submitted form carries any CustomField value input at all.
 * Lets a Server Action skip the extra definition re-fetch entirely when
 * the Procedure Type has no CustomFields (or none were filled in).
 */
export function hasCustomFieldInputs(formData: FormData): boolean {
  for (const key of formData.keys()) {
    if (key.startsWith(CUSTOM_FIELD_NAME_PREFIX)) {
      return true;
    }
  }
  return false;
}

/**
 * Pulls CustomField values out of a submitted `FormData` and coerces each
 * one by its own definition's `valueType` — `api`
 * (`validateCustomFieldValues` in `packages/application`) expects a real
 * `number` for a `NUMBER` field, not the string the browser submits.
 *
 * Every CustomField is optional (ADR 0018 defers "mandatory
 * CONTROL-scoped"), so a blank input is simply omitted. An id with no
 * matching definition is ignored rather than forwarded — the definitions
 * are re-fetched server-side in the Server Action, never trusted from the
 * client. `api` remains the sole authority on constraint/scope coherence.
 */
export function collectCustomFieldValues(
  formData: FormData,
  definitions: readonly CustomFieldDto[],
): CollectedCustomFieldValue[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const collected: CollectedCustomFieldValue[] = [];

  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith(CUSTOM_FIELD_NAME_PREFIX)) {
      continue;
    }
    const definitionId = key.slice(CUSTOM_FIELD_NAME_PREFIX.length);
    const definition = byId.get(definitionId);
    if (!definition || typeof raw !== "string") {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === "") {
      continue;
    }

    if (definition.constraint.valueType === "NUMBER") {
      const numeric = Number(trimmed);
      if (Number.isNaN(numeric)) {
        continue;
      }
      collected.push({ definitionId, value: numeric });
    } else {
      collected.push({ definitionId, value: trimmed });
    }
  }

  return collected;
}

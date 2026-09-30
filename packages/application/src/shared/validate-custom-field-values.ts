import { DomainError, type CustomField, type CustomFieldScope } from "@cirugias-cruz/domain";

/** How a scope reads in a message shown to the physician — never the raw enum. */
const SCOPE_LABEL: Record<CustomFieldScope, string> = { SURGERY: "surgery", CONTROL: "control" };

/** Calendar date only (YYYY-MM-DD) — a raw ISO timestamp is not physician-facing copy. */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface CustomFieldValueInput {
  definitionId: string;
  value: string | number | Date;
}

/**
 * Checks that each recorded CustomField value references a definition
 * that actually exists on the owning ProcedureType, has the expected
 * scope (SURGERY vs. CONTROL), and matches that definition's valueType
 * and constraint. Surgery/Control (Domain) deliberately do not do this
 * themselves — they never reach across the aggregate boundary to a
 * ProcedureType — so it lives here, in Application, which already loads
 * both sides to perform the cross-aggregate tenant checks this project's
 * other operations (e.g. registerSurgery) already rely on.
 */
export function validateCustomFieldValues(
  definitions: readonly CustomField[],
  values: readonly CustomFieldValueInput[],
  expectedScope: CustomFieldScope,
): void {
  for (const { definitionId, value } of values) {
    const definition = definitions.find((candidate) => candidate.id === definitionId);
    if (!definition) {
      throw new DomainError("One of the submitted fields does not belong to this procedure type");
    }
    if (definition.scope !== expectedScope) {
      throw new DomainError(
        `"${definition.name}" is a ${SCOPE_LABEL[definition.scope]} field and cannot be recorded on a ${SCOPE_LABEL[expectedScope]}`,
      );
    }

    const constraint = definition.constraint;
    switch (constraint.valueType) {
      case "NUMBER": {
        if (typeof value !== "number") {
          throw new DomainError(`"${definition.name}" must be a number`);
        }
        if (constraint.min !== undefined && value < constraint.min) {
          throw new DomainError(`"${definition.name}" must be at least ${constraint.min}`);
        }
        if (constraint.max !== undefined && value > constraint.max) {
          throw new DomainError(`"${definition.name}" must be at most ${constraint.max}`);
        }
        break;
      }
      case "ENUM": {
        if (typeof value !== "string" || !constraint.options.includes(value)) {
          throw new DomainError(
            `"${definition.name}" must be one of: ${constraint.options.join(", ")}`,
          );
        }
        break;
      }
      case "TEXT": {
        if (typeof value !== "string") {
          throw new DomainError(`"${definition.name}" must be text`);
        }
        if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
          throw new DomainError(
            `"${definition.name}" must be at most ${constraint.maxLength} characters`,
          );
        }
        break;
      }
      case "DATE": {
        if (!(value instanceof Date)) {
          throw new DomainError(`"${definition.name}" must be a date`);
        }
        if (constraint.min !== undefined && value < constraint.min) {
          throw new DomainError(
            `"${definition.name}" must be on or after ${formatDate(constraint.min)}`,
          );
        }
        if (constraint.max !== undefined && value > constraint.max) {
          throw new DomainError(
            `"${definition.name}" must be on or before ${formatDate(constraint.max)}`,
          );
        }
        break;
      }
    }
  }
}

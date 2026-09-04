import { DomainError, type CustomField, type CustomFieldScope } from "@cirugias-cruz/domain";

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
      throw new DomainError(`CustomField ${definitionId} is not defined on this Procedure Type`);
    }
    if (definition.scope !== expectedScope) {
      throw new DomainError(
        `CustomField "${definition.name}" is scoped to ${definition.scope}, not ${expectedScope}`,
      );
    }

    const constraint = definition.constraint;
    switch (constraint.valueType) {
      case "NUMBER": {
        if (typeof value !== "number") {
          throw new DomainError(`CustomField "${definition.name}" requires a numeric value`);
        }
        if (constraint.min !== undefined && value < constraint.min) {
          throw new DomainError(`CustomField "${definition.name}" must be >= ${constraint.min}`);
        }
        if (constraint.max !== undefined && value > constraint.max) {
          throw new DomainError(`CustomField "${definition.name}" must be <= ${constraint.max}`);
        }
        break;
      }
      case "ENUM": {
        if (typeof value !== "string" || !constraint.options.includes(value)) {
          throw new DomainError(
            `CustomField "${definition.name}" must be one of: ${constraint.options.join(", ")}`,
          );
        }
        break;
      }
      case "TEXT": {
        if (typeof value !== "string") {
          throw new DomainError(`CustomField "${definition.name}" requires a text value`);
        }
        if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
          throw new DomainError(
            `CustomField "${definition.name}" must be at most ${constraint.maxLength} characters`,
          );
        }
        break;
      }
      case "DATE": {
        if (!(value instanceof Date)) {
          throw new DomainError(`CustomField "${definition.name}" requires a date value`);
        }
        if (constraint.min !== undefined && value < constraint.min) {
          throw new DomainError(
            `CustomField "${definition.name}" must be on or after ${constraint.min.toISOString()}`,
          );
        }
        if (constraint.max !== undefined && value > constraint.max) {
          throw new DomainError(
            `CustomField "${definition.name}" must be on or before ${constraint.max.toISOString()}`,
          );
        }
        break;
      }
    }
  }
}

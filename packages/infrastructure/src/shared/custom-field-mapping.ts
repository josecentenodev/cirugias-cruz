import type {
  CustomField,
  CustomFieldAttributes,
  CustomFieldConstraint,
} from "@cirugias-cruz/domain";
import { CustomFieldValue, type CustomFieldValueAttributes } from "@cirugias-cruz/domain";

export interface CustomFieldDefinitionRow {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  scope: string;
  valueType: string;
  constraintMin: string | null;
  constraintMax: string | null;
  constraintMaxLength: number | null;
  enumOptions: unknown;
}

export function toCustomFieldDefinitionRow(
  field: CustomField,
  procedureTypeId: string,
): {
  id: string;
  procedureTypeId: string;
  name: string;
  description: string | undefined;
  unit: string | undefined;
  scope: string;
  valueType: string;
  constraintMin: string | undefined;
  constraintMax: string | undefined;
  constraintMaxLength: number | undefined;
  enumOptions: string[] | undefined;
} {
  const constraint = field.constraint;
  return {
    id: field.id,
    procedureTypeId,
    name: field.name,
    description: field.description,
    unit: constraint.valueType === "NUMBER" ? constraint.unit : undefined,
    scope: field.scope,
    valueType: constraint.valueType,
    constraintMin:
      constraint.valueType === "NUMBER"
        ? constraint.min?.toString()
        : constraint.valueType === "DATE"
          ? constraint.min?.toISOString()
          : undefined,
    constraintMax:
      constraint.valueType === "NUMBER"
        ? constraint.max?.toString()
        : constraint.valueType === "DATE"
          ? constraint.max?.toISOString()
          : undefined,
    constraintMaxLength: constraint.valueType === "TEXT" ? constraint.maxLength : undefined,
    enumOptions: constraint.valueType === "ENUM" ? constraint.options : undefined,
  };
}

export function fromCustomFieldDefinitionRow(row: CustomFieldDefinitionRow): CustomFieldAttributes {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    scope: row.scope as CustomFieldAttributes["scope"],
    constraint: toConstraint(row),
  };
}

function toConstraint(row: CustomFieldDefinitionRow): CustomFieldConstraint {
  switch (row.valueType) {
    case "NUMBER":
      return {
        valueType: "NUMBER",
        unit: row.unit !== null ? row.unit : undefined,
        min: row.constraintMin !== null ? Number(row.constraintMin) : undefined,
        max: row.constraintMax !== null ? Number(row.constraintMax) : undefined,
      };
    case "ENUM":
      return { valueType: "ENUM", options: (row.enumOptions as string[] | null) ?? [] };
    case "TEXT":
      return { valueType: "TEXT", maxLength: row.constraintMaxLength ?? undefined };
    case "DATE":
      return {
        valueType: "DATE",
        min: row.constraintMin !== null ? new Date(row.constraintMin) : undefined,
        max: row.constraintMax !== null ? new Date(row.constraintMax) : undefined,
      };
    default:
      throw new Error(`Corrupt CustomFieldDefinition row: unknown valueType "${row.valueType}"`);
  }
}

export interface ControlDefinitionRow {
  id: string;
  name: string;
  occurrenceMode: string;
  occurrenceCount: number | null;
  occurrencePeriodEvery: number | null;
  occurrencePeriodUnit: string | null;
  occurrenceOffsets: number[];
}

export function toControlDefinitionRow(
  definition: import("@cirugias-cruz/domain").ControlDefinition,
  procedureTypeId: string,
): ControlDefinitionRow & { procedureTypeId: string } {
  const rule = definition.occurrenceRule;
  const base = { id: definition.id, procedureTypeId, name: definition.name };
  switch (rule.mode) {
    case "uncapped":
      return {
        ...base,
        occurrenceMode: "uncapped",
        occurrenceCount: null,
        occurrencePeriodEvery: null,
        occurrencePeriodUnit: null,
        occurrenceOffsets: [],
      };
    case "capped":
      return {
        ...base,
        occurrenceMode: "capped",
        occurrenceCount: rule.count,
        occurrencePeriodEvery: rule.period.every,
        occurrencePeriodUnit: rule.period.unit,
        occurrenceOffsets: [],
      };
    case "scheduled":
      return {
        ...base,
        occurrenceMode: "scheduled",
        occurrenceCount: rule.offsets.length,
        occurrencePeriodEvery: null,
        occurrencePeriodUnit: rule.unit,
        occurrenceOffsets: [...rule.offsets],
      };
  }
}

export function fromControlDefinitionRow(
  row: ControlDefinitionRow,
): import("@cirugias-cruz/domain").ControlDefinitionAttributes {
  const unit = (row.occurrencePeriodUnit ?? "hours") as "hours" | "days" | "weeks";
  switch (row.occurrenceMode) {
    case "uncapped":
      return { id: row.id, name: row.name, occurrenceRule: { mode: "uncapped" } };
    case "capped":
      return {
        id: row.id,
        name: row.name,
        occurrenceRule: {
          mode: "capped",
          count: row.occurrenceCount ?? 1,
          period: { every: row.occurrencePeriodEvery ?? 1, unit },
        },
      };
    case "scheduled":
      return {
        id: row.id,
        name: row.name,
        occurrenceRule: { mode: "scheduled", unit, offsets: [...row.occurrenceOffsets] },
      };
    default:
      // Fail closed: silently reading an unknown mode as "uncapped" would
      // lift a cap the physician set.
      throw new Error(
        `Corrupt ControlDefinition row: unknown occurrenceMode "${row.occurrenceMode}"`,
      );
  }
}

export interface CustomFieldValueRow {
  definitionId: string;
  valueNumber: number | null;
  valueText: string | null;
  valueDate: Date | null;
  valueEnumOption: string | null;
}

/**
 * Only one of the four value columns is ever populated per row — which
 * one is determined by the referenced definition's valueType at write
 * time (see `toCustomFieldValueColumns`). Reading back does not need to
 * know the valueType: exactly one column will be non-null.
 */
export function fromCustomFieldValueRow(row: CustomFieldValueRow): CustomFieldValueAttributes {
  if (row.valueNumber !== null) {
    return { definitionId: row.definitionId, value: row.valueNumber };
  }
  if (row.valueDate !== null) {
    return { definitionId: row.definitionId, value: row.valueDate };
  }
  if (row.valueEnumOption !== null) {
    return { definitionId: row.definitionId, value: row.valueEnumOption };
  }
  if (row.valueText !== null) {
    return { definitionId: row.definitionId, value: row.valueText };
  }
  throw new Error(
    `Corrupt CustomFieldValue row for definition ${row.definitionId}: no value column set`,
  );
}

/**
 * Picks which of the four value columns a CustomFieldValue belongs in,
 * based on its definition's valueType (looked up by the caller, since a
 * Surgery/Control never holds its own CustomField definitions — see
 * validateCustomFieldValues in packages/application).
 */
export function toCustomFieldValueColumns(
  value: CustomFieldValue,
  valueType: string,
): {
  valueNumber: number | null;
  valueText: string | null;
  valueDate: Date | null;
  valueEnumOption: string | null;
} {
  const columns = {
    valueNumber: null,
    valueText: null,
    valueDate: null,
    valueEnumOption: null,
  } as {
    valueNumber: number | null;
    valueText: string | null;
    valueDate: Date | null;
    valueEnumOption: string | null;
  };

  switch (valueType) {
    case "NUMBER":
      columns.valueNumber = value.value as number;
      break;
    case "ENUM":
      columns.valueEnumOption = value.value as string;
      break;
    case "TEXT":
      columns.valueText = value.value as string;
      break;
    case "DATE":
      columns.valueDate = value.value as Date;
      break;
    default:
      throw new Error(`Cannot persist CustomFieldValue: unknown valueType "${valueType}"`);
  }

  return columns;
}

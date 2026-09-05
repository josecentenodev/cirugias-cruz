import type { CustomFieldDto, ProcedureTypeDto } from "./dtos";

/** What `ProcedureTypeList` actually renders — display-ready, decoupled from the wire DTO. */
export interface ProcedureTypeView {
  id: string;
  name: string;
  description: string;
  technique: string;
}

const EMPTY_PLACEHOLDER = "—";

export function toProcedureTypeView(dto: ProcedureTypeDto): ProcedureTypeView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? EMPTY_PLACEHOLDER,
    technique: dto.technique ?? EMPTY_PLACEHOLDER,
  };
}

/**
 * What `CustomFieldList` renders — the `valueType` shown as its own
 * column (`typeLabel`), separate from any bounds/options (`rulesSummary`),
 * so an `ENUM` is never mistaken for `TEXT` the way a single merged
 * "type / constraint" cell allowed.
 */
export interface CustomFieldView {
  id: string;
  name: string;
  description: string;
  /** Only a NUMBER field can carry a unit (ADR 0020); "—" otherwise. */
  unit: string;
  scope: "SURGERY" | "CONTROL";
  typeLabel: string;
  rulesSummary: string;
}

const TYPE_LABELS: Record<CustomFieldDto["constraint"]["valueType"], string> = {
  NUMBER: "Number",
  ENUM: "Options",
  TEXT: "Text",
};

export function toCustomFieldView(dto: CustomFieldDto): CustomFieldView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? EMPTY_PLACEHOLDER,
    unit:
      dto.constraint.valueType === "NUMBER" && dto.constraint.unit
        ? dto.constraint.unit
        : EMPTY_PLACEHOLDER,
    scope: dto.scope,
    typeLabel: TYPE_LABELS[dto.constraint.valueType],
    rulesSummary: summarizeRules(dto.constraint),
  };
}

function summarizeRules(constraint: CustomFieldDto["constraint"]): string {
  switch (constraint.valueType) {
    case "NUMBER": {
      if (constraint.min !== undefined && constraint.max !== undefined) {
        return `${constraint.min}–${constraint.max}`;
      }
      if (constraint.min !== undefined) {
        return `min ${constraint.min}`;
      }
      if (constraint.max !== undefined) {
        return `max ${constraint.max}`;
      }
      return EMPTY_PLACEHOLDER;
    }
    case "ENUM":
      return `one of: ${constraint.options.join(", ")}`;
    case "TEXT":
      return constraint.maxLength !== undefined
        ? `up to ${constraint.maxLength} characters`
        : EMPTY_PLACEHOLDER;
  }
}

/**
 * What the detail/edit page renders. Deliberately keeps `description`/
 * `technique` as `undefined` rather than `ProcedureTypeView`'s "—"
 * placeholder: this feeds an editable form's `defaultValue`, where a
 * literal "—" would be wrong to submit back as the actual value.
 */
export interface ProcedureTypeDetailView {
  id: string;
  name: string;
  description?: string;
  technique?: string;
  customFields: CustomFieldView[];
}

export function toProcedureTypeDetailView(dto: ProcedureTypeDto): ProcedureTypeDetailView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    technique: dto.technique,
    customFields: dto.customFields.map(toCustomFieldView),
  };
}

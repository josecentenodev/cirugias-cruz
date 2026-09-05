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

/** What `CustomFieldList` renders — the constraint union collapsed into one human-readable summary. */
export interface CustomFieldView {
  id: string;
  name: string;
  description: string;
  unit: string;
  magnitude: string;
  scope: "SURGERY" | "CONTROL";
  constraintSummary: string;
}

export function toCustomFieldView(dto: CustomFieldDto): CustomFieldView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? EMPTY_PLACEHOLDER,
    unit: dto.unit,
    magnitude: dto.magnitude,
    scope: dto.scope,
    constraintSummary: summarizeConstraint(dto.constraint),
  };
}

function summarizeConstraint(constraint: CustomFieldDto["constraint"]): string {
  switch (constraint.valueType) {
    case "NUMBER": {
      if (constraint.min !== undefined && constraint.max !== undefined) {
        return `Number (${constraint.min}–${constraint.max})`;
      }
      if (constraint.min !== undefined) {
        return `Number (min ${constraint.min})`;
      }
      if (constraint.max !== undefined) {
        return `Number (max ${constraint.max})`;
      }
      return "Number";
    }
    case "ENUM":
      return constraint.options.join(", ");
    case "TEXT":
      return constraint.maxLength !== undefined
        ? `Text (up to ${constraint.maxLength} characters)`
        : "Text";
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

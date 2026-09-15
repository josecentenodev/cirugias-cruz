import type {
  ControlDefinitionDto,
  ControlOccurrenceRuleDto,
  CustomFieldDto,
  ProcedureTypeDto,
} from "./dtos";

/** What `ProcedureTypeList` actually renders — display-ready, decoupled from the wire DTO. */
export interface ProcedureTypeView {
  id: string;
  name: string;
  description: string;
}

const EMPTY_PLACEHOLDER = "—";

export function toProcedureTypeView(dto: ProcedureTypeDto): ProcedureTypeView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? EMPTY_PLACEHOLDER,
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
  /** True when a value already references it — frozen (ADR 0027). */
  inUse: boolean;
  /**
   * The raw constraint, undecorated (no placeholder substitution, no
   * display-string summarizing) — needed only to prefill `CustomFieldForm`
   * in edit mode, mirroring `ControlDefinitionView`'s `mode`/`count`/
   * `periodEvery`/`periodUnit`. Never rendered directly by `CustomFieldList`.
   */
  editable: {
    description?: string;
    valueType: CustomFieldDto["constraint"]["valueType"];
    unit?: string;
    min?: number;
    max?: number;
    options?: string[];
    maxLength?: number;
  };
}

const TYPE_LABELS: Record<CustomFieldDto["constraint"]["valueType"], string> = {
  NUMBER: "Number",
  ENUM: "Options",
  TEXT: "Text",
};

export function toCustomFieldView(dto: CustomFieldDto, inUse = false): CustomFieldView {
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
    inUse,
    editable: {
      description: dto.description,
      valueType: dto.constraint.valueType,
      unit: dto.constraint.valueType === "NUMBER" ? dto.constraint.unit : undefined,
      min: dto.constraint.valueType === "NUMBER" ? dto.constraint.min : undefined,
      max: dto.constraint.valueType === "NUMBER" ? dto.constraint.max : undefined,
      options: dto.constraint.valueType === "ENUM" ? dto.constraint.options : undefined,
      maxLength: dto.constraint.valueType === "TEXT" ? dto.constraint.maxLength : undefined,
    },
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

/** What `ControlDefinitionList` renders (ADR 0026). */
export interface ControlDefinitionView {
  id: string;
  name: string;
  /** "Uncapped" or e.g. "4 × every 24 hours". */
  ruleSummary: string;
  mode: "uncapped" | "capped";
  count?: number;
  periodEvery?: number;
  periodUnit?: "hours" | "days" | "weeks";
  /** True when a Control already references it — frozen (ADR 0027): no edit, no remove. */
  inUse: boolean;
}

export function summarizeOccurrenceRule(rule: ControlOccurrenceRuleDto): string {
  if (rule.mode === "uncapped") {
    return "Uncapped";
  }
  return `${rule.count} × every ${rule.period.every} ${rule.period.unit}`;
}

export function toControlDefinitionView(
  dto: ControlDefinitionDto,
  inUse: boolean,
): ControlDefinitionView {
  const rule = dto.occurrenceRule;
  return {
    id: dto.id,
    name: dto.name,
    ruleSummary: summarizeOccurrenceRule(rule),
    mode: rule.mode,
    count: rule.mode === "capped" ? rule.count : undefined,
    periodEvery: rule.mode === "capped" ? rule.period.every : undefined,
    periodUnit: rule.mode === "capped" ? rule.period.unit : undefined,
    inUse,
  };
}

/**
 * What the detail/edit page renders. Deliberately keeps `description` as
 * `undefined` rather than `ProcedureTypeView`'s "—" placeholder: this
 * feeds an editable form's `defaultValue`, where a literal "—" would be
 * wrong to submit back as the actual value.
 */
export interface ProcedureTypeDetailView {
  id: string;
  name: string;
  description?: string;
  customFields: CustomFieldView[];
  controlDefinitions: ControlDefinitionView[];
}

/**
 * `inUseDefinitionIds` is a presentation-layer join the page computes by
 * scanning the tenant's Surgeries (`listSurgeries`) for any Control or
 * CustomFieldValue referencing a definition — the same posture the app
 * uses elsewhere (resolving names from sibling reads). It drives ADR
 * 0027's "frozen: no edit, no remove" affordance state; `api` still
 * enforces the rule authoritatively on every mutation.
 */
export function toProcedureTypeDetailView(
  dto: ProcedureTypeDto,
  inUseDefinitionIds: ReadonlySet<string> = new Set(),
): ProcedureTypeDetailView {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    customFields: dto.customFields.map((field) =>
      toCustomFieldView(field, inUseDefinitionIds.has(field.id)),
    ),
    controlDefinitions: (dto.controlDefinitions ?? []).map((definition) =>
      toControlDefinitionView(definition, inUseDefinitionIds.has(definition.id)),
    ),
  };
}

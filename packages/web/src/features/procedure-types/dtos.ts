/** Mirrors `api`'s CustomField constraint union (`packages/http/src/routes/core-loop.ts`) exactly. */
export type CustomFieldConstraint =
  | { valueType: "NUMBER"; unit?: string; min?: number; max?: number }
  | { valueType: "ENUM"; options: string[] }
  | { valueType: "TEXT"; maxLength?: number };

/** Wire shape for one CustomField definition — matches `serializeProcedureType`'s `customFields` entries. */
export interface CustomFieldDto {
  id: string;
  name: string;
  description?: string;
  scope: "SURGERY" | "CONTROL";
  constraint: CustomFieldConstraint;
}

/** Mirrors `api`'s `ControlOccurrenceRule` union (ADR 0026). */
export type ControlOccurrenceRuleDto =
  | { mode: "uncapped" }
  | {
      mode: "capped";
      count: number;
      period: { every: number; unit: "hours" | "days" | "weeks" };
    };

/** Wire shape for one control definition — matches `serializeControlDefinition`. */
export interface ControlDefinitionDto {
  id: string;
  name: string;
  occurrenceRule: ControlOccurrenceRuleDto;
}

/**
 * Wire shape `api` actually returns for a Procedure Type — matches
 * `serializeProcedureType` in `packages/http/src/routes/core-loop.ts`
 * field-for-field, not assumed. `customFields` was added by ADR 0018/0019
 * (Milestone 8.6); `controlDefinitions` by ADR 0026 (Milestone 11) —
 * always arrays, empty when none defined yet.
 */
export interface ProcedureTypeDto {
  id: string;
  physicianId: string;
  name: string;
  description?: string;
  customFields: CustomFieldDto[];
  controlDefinitions: ControlDefinitionDto[];
}

/** `POST /procedure-types/:id/control-definitions`'s response shape. */
export interface AddControlDefinitionResponse {
  procedureTypeId: string;
  controlDefinitionId: string;
}

/** `POST /procedure-types`'s response shape (`RegisterProcedureTypeOutput`). */
export interface RegisterProcedureTypeResponse {
  procedureTypeId: string;
}

/** `POST /procedure-types/:id/custom-fields`'s response shape (`AddCustomFieldOutput`). */
export interface AddCustomFieldResponse {
  procedureTypeId: string;
  customFieldId: string;
}

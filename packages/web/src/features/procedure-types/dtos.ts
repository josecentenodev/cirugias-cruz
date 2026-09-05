/** Mirrors `api`'s CustomField constraint union (`packages/http/src/routes/core-loop.ts`) exactly. */
export type CustomFieldConstraint =
  | { valueType: "NUMBER"; min?: number; max?: number }
  | { valueType: "ENUM"; options: string[] }
  | { valueType: "TEXT"; maxLength?: number };

/** Wire shape for one CustomField definition — matches `serializeProcedureType`'s `customFields` entries. */
export interface CustomFieldDto {
  id: string;
  name: string;
  description?: string;
  unit: string;
  magnitude: string;
  scope: "SURGERY" | "CONTROL";
  constraint: CustomFieldConstraint;
}

/**
 * Wire shape `api` actually returns for a Procedure Type — matches
 * `serializeProcedureType` in `packages/http/src/routes/core-loop.ts`
 * field-for-field, not assumed. `customFields` was added by ADR 0018/0019
 * (Milestone 8.6) — always an array, empty when none defined yet.
 */
export interface ProcedureTypeDto {
  id: string;
  physicianId: string;
  name: string;
  description?: string;
  technique?: string;
  customFields: CustomFieldDto[];
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

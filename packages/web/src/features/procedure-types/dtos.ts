/**
 * Wire shape `api` actually returns for a Procedure Type — matches
 * `serializeProcedureType` in `packages/http/src/routes/core-loop.ts`
 * field-for-field, not assumed.
 */
export interface ProcedureTypeDto {
  id: string;
  physicianId: string;
  name: string;
  description?: string;
  technique?: string;
}

/** `POST /procedure-types`'s response shape (`RegisterProcedureTypeOutput`). */
export interface RegisterProcedureTypeResponse {
  procedureTypeId: string;
}

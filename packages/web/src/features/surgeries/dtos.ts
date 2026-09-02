/**
 * Wire shapes `api` actually returns for a Surgery — matches
 * `serializeSurgery` in `packages/http/src/routes/core-loop.ts`
 * field-for-field, not assumed. Surgery is an Aggregate: `controls` and
 * `participatingResidentIds` arrive nested inside the same response —
 * there is no separate `/controls` resource to fetch, matching
 * `packages/domain`'s own rule that Control has no existence or
 * repository outside its owning Surgery.
 */
export type ControlAuthorDto =
  { type: "physician"; physicianId: string } | { type: "resident"; residentId: string };

export interface ControlDto {
  id: string;
  observations: string;
  recordedAt: string;
  author: ControlAuthorDto;
}

export interface SurgeryDto {
  id: string;
  physicianId: string;
  patientId: string;
  procedureTypeId: string;
  performedAt: string;
  state: string;
  participatingResidentIds: string[];
  controls: ControlDto[];
}

/** `POST /surgeries`'s response shape (`RegisterSurgeryOutput`). */
export interface RegisterSurgeryResponse {
  surgeryId: string;
}

/** `POST /surgeries/:id/controls`'s response shape (`RecordControlOutput`). */
export interface RecordControlResponse {
  surgeryId: string;
  controlId: string;
}

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

/** One recorded CustomField value — matches `serializeSurgery`'s `customFieldValues` entries. */
export interface CustomFieldValueDto {
  definitionId: string;
  value: string | number;
}

export interface ControlDto {
  id: string;
  /** Optional since Milestone 11 (A4/F-08). */
  observations?: string;
  recordedAt: string;
  author: ControlAuthorDto;
  /** The control definition (ADR 0026) this recording is an occurrence of, or absent for an ad-hoc control. */
  definitionId?: string;
  customFieldValues: CustomFieldValueDto[];
}

/** One entry of `serializeSurgery`'s `followUp` — the per-capped-definition projection (ADR 0026). */
export interface FollowUpDto {
  definitionId: string;
  name: string;
  recorded: number;
  expected: number;
  nextDueAt: string | null;
}

export interface SurgeryDto {
  id: string;
  physicianId: string;
  patientId: string;
  procedureTypeId: string;
  performedAt: string;
  state: string;
  participatingResidentIds: string[];
  customFieldValues: CustomFieldValueDto[];
  controls: ControlDto[];
  followUp: FollowUpDto[];
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

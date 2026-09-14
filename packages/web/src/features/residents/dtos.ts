/**
 * Wire shape `api` actually returns for a Resident — matches
 * `toResidentDto` in `packages/http/src/routes/resident.ts` field-for-
 * field. No `observations` (unlike Patient): Resident's Person shape
 * doesn't carry one — not omitted here, never had one.
 */
export interface ResidentDto {
  id: string;
  physicianId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  metadata?: Record<string, unknown>;
  active: boolean;
  /** Invitation status (ADR 0029) — `false` while the Resident hasn't accepted their invitation yet. */
  invitationAccepted: boolean;
  invitedAt: string | null;
  acceptedAt: string | null;
}

/** `POST /residents`'s response shape (`RegisterResidentOutput`). */
export interface RegisterResidentResponse {
  residentId: string;
}

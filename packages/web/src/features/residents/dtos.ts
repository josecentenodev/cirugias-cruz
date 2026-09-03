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
}

/**
 * `POST /residents`'s response shape (`RegisterResidentOutput`) —
 * `temporaryPassword` is the system-generated credential the Physician
 * hands to the Resident out of band (ADR 0017); it's shown once here,
 * and again later via `GET /residents/:id/temporary-password` for as
 * long as it hasn't been changed.
 */
export interface RegisterResidentResponse {
  residentId: string;
  temporaryPassword: string;
}

/** `GET /residents/:id/temporary-password` and `POST /residents/:id/password-reset`'s response shape. */
export interface TemporaryPasswordResponse {
  temporaryPassword: string | null;
}

/**
 * Wire shape `api` actually returns for a Patient — matches
 * `serializePatient` in `packages/http/src/routes/core-loop.ts`
 * field-for-field, not assumed. `dateOfBirth` arrives as an ISO string
 * (Fastify serializes the Domain entity's `Date` via `JSON.stringify`'s
 * default `Date.prototype.toJSON()`), not a `Date` object.
 */
export interface PatientDto {
  id: string;
  physicianId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  metadata?: Record<string, unknown>;
  observations?: string;
}

/** `POST /patients`'s response shape (`RegisterPatientOutput`). */
export interface RegisterPatientResponse {
  patientId: string;
}

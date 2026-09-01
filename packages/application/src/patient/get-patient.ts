import type { Patient } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { PatientRepository } from "./patient-repository.js";

export interface GetPatientInput {
  physicianId: string;
  patientId: string;
}

export interface GetPatientDeps {
  patientRepository: PatientRepository;
}

/**
 * Retrieves a single Patient, verifying it belongs to the acting
 * physician's tenant. A patient belonging to a different physician is
 * reported as not found (404), never as forbidden (403) — this avoids
 * leaking cross-tenant existence, mirroring the pattern already used for
 * writes (e.g. registerSurgery's cross-aggregate tenant checks).
 */
export function getPatient(deps: GetPatientDeps) {
  return async function execute(input: GetPatientInput): Promise<Patient> {
    const patient = await deps.patientRepository.findById(input.patientId);
    if (!patient || patient.physicianId !== input.physicianId) {
      throw new NotFoundError(`Patient ${input.patientId} was not found`);
    }

    return patient;
  };
}

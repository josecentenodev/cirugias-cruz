import type { Patient } from "@cirugias-cruz/domain";
import type { PatientRepository } from "./patient-repository.js";

export interface ListPatientsInput {
  physicianId: string;
  /** Optional free-text filter — matched against first name / last name / dni (case-insensitive). */
  query?: string;
}

export interface ListPatientsDeps {
  patientRepository: PatientRepository;
}

/** Lists Patients owned by the acting physician's tenant, optionally narrowed by `query`. */
export function listPatients(deps: ListPatientsDeps) {
  return async function execute(input: ListPatientsInput): Promise<Patient[]> {
    return deps.patientRepository.findByPhysicianId(input.physicianId, input.query);
  };
}

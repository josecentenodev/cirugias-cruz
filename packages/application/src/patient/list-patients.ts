import type { Patient } from "@cirugias-cruz/domain";
import type { PatientRepository } from "./patient-repository.js";

export interface ListPatientsInput {
  physicianId: string;
}

export interface ListPatientsDeps {
  patientRepository: PatientRepository;
}

/** Lists every Patient owned by the acting physician's tenant — nothing more. */
export function listPatients(deps: ListPatientsDeps) {
  return async function execute(input: ListPatientsInput): Promise<Patient[]> {
    return deps.patientRepository.findByPhysicianId(input.physicianId);
  };
}

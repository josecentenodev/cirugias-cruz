import type { Resident } from "@cirugias-cruz/domain";
import type { ResidentRepository } from "./resident-repository.js";

export interface ListResidentsInput {
  physicianId: string;
}

export interface ListResidentsDeps {
  residentRepository: ResidentRepository;
}

/** Lists every Resident owned by the acting physician's tenant — nothing more. */
export function listResidents(deps: ListResidentsDeps) {
  return async function execute(input: ListResidentsInput): Promise<Resident[]> {
    return deps.residentRepository.findByPhysicianId(input.physicianId);
  };
}

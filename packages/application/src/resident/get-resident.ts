import type { Resident } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentRepository } from "./resident-repository.js";

export interface GetResidentInput {
  physicianId: string;
  residentId: string;
}

export interface GetResidentDeps {
  residentRepository: ResidentRepository;
}

/**
 * Retrieves a single Resident, verifying it belongs to the acting
 * physician's tenant. A resident belonging to a different physician is
 * reported as not found (404), never as forbidden (403) — mirrors
 * getPatient/getSurgery exactly.
 */
export function getResident(deps: GetResidentDeps) {
  return async function execute(input: GetResidentInput): Promise<Resident> {
    const resident = await deps.residentRepository.findById(input.residentId);
    if (!resident || resident.physicianId !== input.physicianId) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    return resident;
  };
}

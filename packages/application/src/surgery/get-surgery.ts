import type { Surgery } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface GetSurgeryInput {
  physicianId: string;
  surgeryId: string;
}

export interface GetSurgeryDeps {
  surgeryRepository: SurgeryRepository;
}

/**
 * Retrieves a single Surgery — including its full Control history, since
 * SurgeryRepository.findById already loads the whole aggregate via
 * Surgery.reconstitute — verifying it belongs to the acting physician's
 * tenant. Not found (404) for a foreign Surgery — see getPatient for the
 * same reasoning.
 */
export function getSurgery(deps: GetSurgeryDeps) {
  return async function execute(input: GetSurgeryInput): Promise<Surgery> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery || surgery.physicianId !== input.physicianId) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    return surgery;
  };
}

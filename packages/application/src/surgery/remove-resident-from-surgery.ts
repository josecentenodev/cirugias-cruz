import { DomainError } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentRepository } from "../resident/resident-repository.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface RemoveResidentFromSurgeryInput {
  physicianId: string;
  surgeryId: string;
  residentId: string;
}

export interface RemoveResidentFromSurgeryOutput {
  surgeryId: string;
  participatingResidentIds: readonly string[];
}

export interface RemoveResidentFromSurgeryDeps {
  surgeryRepository: SurgeryRepository;
  residentRepository: ResidentRepository;
}

/**
 * Orchestrates "the physician removes a resident from a surgery". Mirrors
 * assignResidentToSurgery exactly, but calls Surgery.removeResident,
 * which rejects removal once the resident has recorded a control on this
 * surgery — see docs/architecture/application-layer-discovery.md §4.3.
 */
export function removeResidentFromSurgery(deps: RemoveResidentFromSurgeryDeps) {
  return async function execute(
    input: RemoveResidentFromSurgeryInput,
  ): Promise<RemoveResidentFromSurgeryOutput> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    const resident = await deps.residentRepository.findById(input.residentId);
    if (!resident) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    if (resident.physicianId !== input.physicianId) {
      throw new DomainError(
        "A resident may only be removed from a surgery within their own physician's tenant",
      );
    }

    surgery.removeResident(resident.id, input.physicianId);
    await deps.surgeryRepository.save(surgery);

    return {
      surgeryId: surgery.id,
      participatingResidentIds: surgery.participatingResidentIds,
    };
  };
}

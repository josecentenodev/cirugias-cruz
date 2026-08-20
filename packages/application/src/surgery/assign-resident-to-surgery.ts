import { DomainError } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentRepository } from "../resident/resident-repository.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface AssignResidentToSurgeryInput {
  physicianId: string;
  surgeryId: string;
  residentId: string;
}

export interface AssignResidentToSurgeryOutput {
  surgeryId: string;
  participatingResidentIds: readonly string[];
}

export interface AssignResidentToSurgeryDeps {
  surgeryRepository: SurgeryRepository;
  residentRepository: ResidentRepository;
}

/**
 * Orchestrates "the physician assigns a resident to a surgery".
 *
 * Surgery.assignResident only knows how to check that the acting
 * physician owns the Surgery — its signature has no way to receive the
 * Resident's own tenant, so it cannot verify Resident/Surgery tenant
 * agreement itself. That check happens here, using the domain's own
 * DomainError (it is a business rule, not an application-specific
 * concern) — see docs/architecture/application-layer-discovery.md §4.3
 * for why this is a gap in the aggregate's signature, not a duplicated
 * invariant.
 *
 * The participation rules themselves (assignment means immediate
 * participation, tenant ownership of the Surgery) remain entirely
 * Surgery's responsibility.
 */
export function assignResidentToSurgery(deps: AssignResidentToSurgeryDeps) {
  return async function execute(
    input: AssignResidentToSurgeryInput,
  ): Promise<AssignResidentToSurgeryOutput> {
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
        "A resident may only be assigned to a surgery within their own physician's tenant",
      );
    }

    surgery.assignResident(resident.id, input.physicianId);
    await deps.surgeryRepository.save(surgery);

    return {
      surgeryId: surgery.id,
      participatingResidentIds: surgery.participatingResidentIds,
    };
  };
}

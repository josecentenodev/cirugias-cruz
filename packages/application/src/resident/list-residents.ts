import type { Resident } from "@cirugias-cruz/domain";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentRepository } from "./resident-repository.js";

export interface ListResidentsInput {
  physicianId: string;
}

export interface ResidentWithActive {
  resident: Resident;
  active: boolean;
}

export interface ListResidentsDeps {
  residentRepository: ResidentRepository;
  residentCredentialRepository: ResidentCredentialRepository;
}

/**
 * Lists every Resident owned by the acting physician's tenant, alongside
 * whether each is currently active. `active` lives on `ResidentCredential`
 * (Application/Infrastructure), deliberately kept off the Domain
 * `Resident` entity — see that repository's own doc-comment — so it's
 * merged in here rather than in Domain.
 */
export function listResidents(deps: ListResidentsDeps) {
  return async function execute(input: ListResidentsInput): Promise<ResidentWithActive[]> {
    const residents = await deps.residentRepository.findByPhysicianId(input.physicianId);
    return Promise.all(
      residents.map(async (resident) => {
        const credential = await deps.residentCredentialRepository.findByResidentId(resident.id);
        return { resident, active: credential?.active ?? true };
      }),
    );
  };
}

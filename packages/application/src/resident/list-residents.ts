import type { Resident } from "@cirugias-cruz/domain";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentRepository } from "./resident-repository.js";

export interface ListResidentsInput {
  physicianId: string;
}

export interface ResidentWithActive {
  resident: Resident;
  active: boolean;
  invitationAccepted: boolean;
  invitedAt: Date | null;
  acceptedAt: Date | null;
}

export interface ListResidentsDeps {
  residentRepository: ResidentRepository;
  residentCredentialRepository: ResidentCredentialRepository;
}

/**
 * Lists every Resident owned by the acting physician's tenant, alongside
 * whether each is currently active and its invitation status (ADR
 * 0029). Both live on `ResidentCredential` (Application/Infrastructure),
 * deliberately kept off the Domain `Resident` entity — see that
 * repository's own doc-comment — so they're merged in here rather than
 * in Domain.
 */
export function listResidents(deps: ListResidentsDeps) {
  return async function execute(input: ListResidentsInput): Promise<ResidentWithActive[]> {
    const residents = await deps.residentRepository.findByPhysicianId(input.physicianId);
    return Promise.all(
      residents.map(async (resident) => {
        const credential = await deps.residentCredentialRepository.findByResidentId(resident.id);
        return {
          resident,
          active: credential?.active ?? true,
          invitationAccepted: Boolean(credential?.passwordHash),
          invitedAt: credential?.invitedAt ?? null,
          acceptedAt: credential?.acceptedAt ?? null,
        };
      }),
    );
  };
}

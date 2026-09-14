import type { Resident } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentRepository } from "./resident-repository.js";

export interface GetResidentInput {
  physicianId: string;
  residentId: string;
}

export interface ResidentWithActive {
  resident: Resident;
  active: boolean;
  /** Invitation status (ADR 0029) — `false` while the Resident hasn't accepted yet. */
  invitationAccepted: boolean;
  invitedAt: Date | null;
  acceptedAt: Date | null;
}

export interface GetResidentDeps {
  residentRepository: ResidentRepository;
  residentCredentialRepository: ResidentCredentialRepository;
}

/**
 * Retrieves a single Resident, verifying it belongs to the acting
 * physician's tenant, alongside whether it's currently active and its
 * invitation status (see `listResidents`'s doc-comment for why that's
 * merged in from `ResidentCredentialRepository` rather than living on
 * Domain). A resident belonging to a different physician is reported as
 * not found (404), never as forbidden (403) — mirrors getPatient/
 * getSurgery exactly.
 */
export function getResident(deps: GetResidentDeps) {
  return async function execute(input: GetResidentInput): Promise<ResidentWithActive> {
    const resident = await deps.residentRepository.findById(input.residentId);
    if (!resident || resident.physicianId !== input.physicianId) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    const credential = await deps.residentCredentialRepository.findByResidentId(resident.id);
    return {
      resident,
      active: credential?.active ?? true,
      invitationAccepted: Boolean(credential?.passwordHash),
      invitedAt: credential?.invitedAt ?? null,
      acceptedAt: credential?.acceptedAt ?? null,
    };
  };
}

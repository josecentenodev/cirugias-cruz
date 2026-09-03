import type { Surgery } from "@cirugias-cruz/domain";
import { NotFoundError } from "../shared/not-found-error.js";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface GetSurgeryForResidentInput {
  residentId: string;
  surgeryId: string;
}

export interface GetSurgeryForResidentDeps {
  surgeryRepository: SurgeryRepository;
}

/**
 * Retrieves a single Surgery for a logged-in Resident — full read,
 * including every Control on it (not only their own; ADR 0017, decision
 * item 7), gated on participation rather than tenant ownership (the
 * Physician's equivalent, `getSurgery`, gates on `physicianId`). Not
 * found (404), not "forbidden", for a Surgery the Resident doesn't
 * participate in — same reasoning `getSurgery` already uses for a
 * foreign tenant.
 */
export function getSurgeryForResident(deps: GetSurgeryForResidentDeps) {
  return async function execute(input: GetSurgeryForResidentInput): Promise<Surgery> {
    const surgery = await deps.surgeryRepository.findById(input.surgeryId);
    if (!surgery || !surgery.participatingResidentIds.includes(input.residentId)) {
      throw new NotFoundError(`Surgery ${input.surgeryId} was not found`);
    }

    return surgery;
  };
}

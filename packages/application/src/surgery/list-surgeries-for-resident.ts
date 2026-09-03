import type { Surgery } from "@cirugias-cruz/domain";
import type { SurgeryRepository } from "./surgery-repository.js";

export interface ListSurgeriesForResidentInput {
  residentId: string;
}

export interface ListSurgeriesForResidentDeps {
  surgeryRepository: SurgeryRepository;
}

/**
 * The "Surgery panel" a logged-in Resident sees (ADR 0017) — every
 * Surgery they participate in, nothing else in the tenant. Participation
 * is Surgery-scoped and assignment-based (0010): unrelated to which
 * Patient it's for, and not gated on having recorded a Control yet.
 */
export function listSurgeriesForResident(deps: ListSurgeriesForResidentDeps) {
  return async function execute(input: ListSurgeriesForResidentInput): Promise<Surgery[]> {
    return deps.surgeryRepository.findByResidentId(input.residentId);
  };
}

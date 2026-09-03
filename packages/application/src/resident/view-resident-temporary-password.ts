import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";

export interface ViewResidentTemporaryPasswordInput {
  physicianId: string;
  residentId: string;
}

export interface ViewResidentTemporaryPasswordOutput {
  temporaryPassword: string | null;
}

/**
 * Lets the Physician read the Resident's current temporary password
 * back, repeatedly, for as long as it's still temporary (ADR 0017,
 * decision item 4). Returns `null` once the Resident has changed it —
 * there's nothing valid left to show, not an error.
 */
export function viewResidentTemporaryPassword(deps: {
  residentCredentialRepository: ResidentCredentialRepository;
}) {
  return async function execute(
    input: ViewResidentTemporaryPasswordInput,
  ): Promise<ViewResidentTemporaryPasswordOutput> {
    const credential = await deps.residentCredentialRepository.findByResidentId(input.residentId);
    if (!credential || credential.physicianId !== input.physicianId) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    return { temporaryPassword: credential.temporaryPassword };
  };
}

import { NotFoundError } from "../shared/not-found-error.js";
import type { PasswordHasher } from "../physician/password-hasher.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { TemporaryPasswordGenerator } from "./temporary-password-generator.js";

export interface ResetResidentPasswordInput {
  physicianId: string;
  residentId: string;
}

export interface ResetResidentPasswordOutput {
  temporaryPassword: string;
}

export interface ResetResidentPasswordDeps {
  residentCredentialRepository: ResidentCredentialRepository;
  passwordHasher: PasswordHasher;
  temporaryPasswordGenerator: TemporaryPasswordGenerator;
}

/**
 * The Physician-triggered "blanqueo" (ADR 0017, decision item 8): a
 * Resident who forgot their password gets a fresh system-generated
 * temporary one, re-arming the mandatory-change-on-next-login rule.
 * Exactly the same mechanism as initial issuance in `registerResident`,
 * just re-triggered on demand — not a separate feature.
 */
export function resetResidentPassword(deps: ResetResidentPasswordDeps) {
  return async function execute(
    input: ResetResidentPasswordInput,
  ): Promise<ResetResidentPasswordOutput> {
    const credential = await deps.residentCredentialRepository.findByResidentId(input.residentId);
    if (!credential || credential.physicianId !== input.physicianId) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    const temporaryPassword = deps.temporaryPasswordGenerator.generate();
    const passwordHash = await deps.passwordHasher.hash(temporaryPassword);
    await deps.residentCredentialRepository.reissueTemporaryPassword(
      input.residentId,
      temporaryPassword,
      passwordHash,
    );

    return { temporaryPassword };
  };
}

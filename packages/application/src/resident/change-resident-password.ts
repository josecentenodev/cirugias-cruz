import { DomainError } from "@cirugias-cruz/domain";
import type { PasswordHasher } from "../physician/password-hasher.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";

export interface ChangeResidentPasswordInput {
  residentId: string;
  newPassword: string;
}

export interface ChangeResidentPasswordDeps {
  residentCredentialRepository: ResidentCredentialRepository;
  passwordHasher: PasswordHasher;
}

/**
 * A Resident voluntarily changing their own password once logged in —
 * unrelated to invitation acceptance (`acceptResidentInvitation`, ADR
 * 0029, is what sets the *first* password). The caller is already
 * authenticated (an HTTP-level session), so this takes no current-
 * password check — same posture as this product not inventing a
 * password-strength rule anywhere else (only non-empty is required,
 * matching the Physician registration schema).
 */
export function changeResidentPassword(deps: ChangeResidentPasswordDeps) {
  return async function execute(input: ChangeResidentPasswordInput): Promise<void> {
    if (!input.newPassword.trim()) {
      throw new DomainError("Password is required");
    }

    const passwordHash = await deps.passwordHasher.hash(input.newPassword);
    await deps.residentCredentialRepository.recordPasswordChange(input.residentId, passwordHash);
  };
}

import { DomainError } from "@cirugias-cruz/domain";
import type { EmailConfirmationTokenRepository } from "./email-confirmation-token-repository.js";
import type { PhysicianCredentialRepository } from "./physician-credential-repository.js";

export interface ConfirmPhysicianEmailInput {
  token: string;
}

export interface ConfirmPhysicianEmailOutput {
  physicianId: string;
}

export interface ConfirmPhysicianEmailDeps {
  emailConfirmationTokenRepository: EmailConfirmationTokenRepository;
  physicianCredentialRepository: PhysicianCredentialRepository;
}

/**
 * Redeems a confirmation token (ADR 0015): marks the credential
 * confirmed and invalidates the token so it can't be reused. A missing
 * or expired token is reported the same way — the caller (a physician
 * who clicked an old or already-used link) doesn't need to distinguish
 * them, and `EmailConfirmationTokenRepository.findById` already treats
 * an expired token as not found (mirrors `SessionRepository`).
 */
export function confirmPhysicianEmail(deps: ConfirmPhysicianEmailDeps) {
  return async function execute(
    input: ConfirmPhysicianEmailInput,
  ): Promise<ConfirmPhysicianEmailOutput> {
    const token = await deps.emailConfirmationTokenRepository.findById(input.token);
    if (!token) {
      throw new DomainError("This confirmation link is invalid or has expired");
    }

    await deps.physicianCredentialRepository.markConfirmed(token.physicianId);
    await deps.emailConfirmationTokenRepository.delete(token.id);

    return { physicianId: token.physicianId };
  };
}

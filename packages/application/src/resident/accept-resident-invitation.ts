import { DomainError } from "@cirugias-cruz/domain";
import type { PasswordHasher } from "../physician/password-hasher.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentInvitationTokenRepository } from "./resident-invitation-token-repository.js";

export interface AcceptResidentInvitationInput {
  token: string;
  password: string;
}

export interface AcceptResidentInvitationOutput {
  residentId: string;
}

export interface AcceptResidentInvitationDeps {
  residentInvitationTokenRepository: ResidentInvitationTokenRepository;
  residentCredentialRepository: ResidentCredentialRepository;
  passwordHasher: PasswordHasher;
}

/**
 * Redeems an invitation token (ADR 0029): the Resident sets their own
 * password, which is what "accepted" means (see the ADR's "Technical
 * representation" — no separate status field, `passwordHash` being set
 * is the state). Mirrors `confirmPhysicianEmail`'s shape: a missing or
 * expired token is reported the same way — the caller doesn't need to
 * distinguish them, and `ResidentInvitationTokenRepository.findById`
 * already treats an expired token as not found.
 */
export function acceptResidentInvitation(deps: AcceptResidentInvitationDeps) {
  return async function execute(
    input: AcceptResidentInvitationInput,
  ): Promise<AcceptResidentInvitationOutput> {
    if (!input.password.trim()) {
      throw new DomainError("Password is required");
    }

    const token = await deps.residentInvitationTokenRepository.findById(input.token);
    if (!token) {
      throw new DomainError("This invitation link is invalid or has expired");
    }

    const passwordHash = await deps.passwordHasher.hash(input.password);
    await deps.residentCredentialRepository.recordInvitationAccepted(
      token.residentId,
      passwordHash,
      new Date(),
    );
    await deps.residentInvitationTokenRepository.delete(token.id);

    return { residentId: token.residentId };
  };
}

import type { SessionRepository } from "../physician/session-repository.js";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentInvitationTokenRepository } from "./resident-invitation-token-repository.js";

export interface SetResidentActiveInput {
  physicianId: string;
  residentId: string;
  active: boolean;
}

export interface SetResidentActiveDeps {
  residentCredentialRepository: ResidentCredentialRepository;
  sessionRepository: SessionRepository;
  residentInvitationTokenRepository: ResidentInvitationTokenRepository;
}

/**
 * Activates/deactivates a Resident's ability to log in (ADR 0017,
 * decision item 9). Deactivating also forces the immediate closure of
 * any session that Resident currently holds — not just future logins —
 * so it takes effect right away rather than "next time they'd have had
 * to log back in anyway." Also invalidates any outstanding, unaccepted
 * invitation token (ADR 0029, decision item 8) — a deactivated Resident
 * should not be able to accept a stale invitation and gain access.
 */
export function setResidentActive(deps: SetResidentActiveDeps) {
  return async function execute(input: SetResidentActiveInput): Promise<void> {
    const credential = await deps.residentCredentialRepository.findByResidentId(input.residentId);
    if (!credential || credential.physicianId !== input.physicianId) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    await deps.residentCredentialRepository.setActive(input.residentId, input.active);

    if (!input.active) {
      await deps.sessionRepository.deleteByResidentId(input.residentId);
      await deps.residentInvitationTokenRepository.deleteByResidentId(input.residentId);
    }
  };
}

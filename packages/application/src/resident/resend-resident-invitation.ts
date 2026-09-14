import type { EmailSender } from "../physician/email-sender.js";
import { NotFoundError } from "../shared/not-found-error.js";
import type { ResidentCredentialRepository } from "./resident-credential-repository.js";
import type { ResidentInvitationTokenRepository } from "./resident-invitation-token-repository.js";
import type { ResidentRepository } from "./resident-repository.js";
import { sendResidentInvitation } from "./send-resident-invitation.js";

export interface ResendResidentInvitationInput {
  physicianId: string;
  residentId: string;
  webBaseUrl: string;
}

export interface ResendResidentInvitationDeps {
  residentRepository: ResidentRepository;
  residentCredentialRepository: ResidentCredentialRepository;
  residentInvitationTokenRepository: ResidentInvitationTokenRepository;
  emailSender: EmailSender;
}

/**
 * The Physician-triggered "resend invitation" (ADR 0029, decision item
 * 6 — replaces ADR 0017's "blanqueo"): clears whatever credential state
 * exists (accepted or still pending), invalidates any outstanding
 * token, and sends a fresh one. Until the Resident accepts again, they
 * cannot log in at all — there is no fallback credential left valid,
 * a deliberate tightening over the mechanism this replaces (see the
 * ADR's rationale).
 */
export function resendResidentInvitation(deps: ResendResidentInvitationDeps) {
  return async function execute(input: ResendResidentInvitationInput): Promise<void> {
    const credential = await deps.residentCredentialRepository.findByResidentId(input.residentId);
    if (!credential || credential.physicianId !== input.physicianId) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }
    const resident = await deps.residentRepository.findById(input.residentId);
    if (!resident) {
      throw new NotFoundError(`Resident ${input.residentId} was not found`);
    }

    await deps.residentInvitationTokenRepository.deleteByResidentId(input.residentId);
    await deps.residentCredentialRepository.recordInvitationResent(input.residentId, new Date());

    await sendResidentInvitation(deps)({
      residentId: input.residentId,
      email: credential.email,
      firstName: resident.firstName,
      webBaseUrl: input.webBaseUrl,
    });
  };
}

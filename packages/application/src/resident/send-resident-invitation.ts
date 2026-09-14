import type { EmailSender } from "../physician/email-sender.js";
import type { ResidentInvitationTokenRepository } from "./resident-invitation-token-repository.js";

export interface SendResidentInvitationInput {
  residentId: string;
  email: string;
  firstName: string;
  /**
   * `web`'s own public origin — same reasoning as
   * `SendConfirmationEmailInput.webBaseUrl` (ADR 0015): the invitation
   * link points at `web`, never at `api` directly (BFF pattern).
   */
  webBaseUrl: string;
}

export interface SendResidentInvitationDeps {
  residentInvitationTokenRepository: ResidentInvitationTokenRepository;
  emailSender: EmailSender;
}

/**
 * Issues a fresh invitation token and emails the acceptance link (ADR
 * 0029). Orchestrated by the `POST /residents` route right after
 * `registerResident` succeeds — kept as its own operation, not folded
 * into `registerResident`, mirroring `sendConfirmationEmail`'s
 * placement after `registerPhysician` for the same reason (that
 * operation's own dependency list stays unchanged).
 */
export function sendResidentInvitation(deps: SendResidentInvitationDeps) {
  return async function execute(input: SendResidentInvitationInput): Promise<void> {
    const token = await deps.residentInvitationTokenRepository.create(input.residentId);
    const acceptUrl = `${input.webBaseUrl}/accept-invitation?token=${token.id}`;

    await deps.emailSender.send({
      to: input.email,
      subject: "You've been invited to Seguimiento de Cirugías",
      text:
        `Hi ${input.firstName},\n\nYour physician has invited you to Seguimiento de Cirugías. ` +
        `Set your password to accept the invitation:\n${acceptUrl}\n\n` +
        `This link expires in 7 days.`,
      html:
        `<p>Hi ${input.firstName},</p>` +
        `<p>Your physician has invited you to Seguimiento de Cirugías. Set your password to accept the invitation:</p>` +
        `<p><a href="${acceptUrl}">Accept invitation</a></p>` +
        `<p>This link expires in 7 days.</p>`,
    });
  };
}

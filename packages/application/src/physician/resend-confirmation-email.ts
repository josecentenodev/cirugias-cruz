import type { EmailConfirmationTokenRepository } from "./email-confirmation-token-repository.js";
import type { EmailSender } from "./email-sender.js";
import type { PhysicianCredentialRepository } from "./physician-credential-repository.js";
import { sendConfirmationEmail } from "./send-confirmation-email.js";

export interface ResendConfirmationEmailInput {
  email: string;
  /**
   * Only shapes the email's greeting — optional because the caller
   * (typically a login-time "resend" prompt, closing the gap 0015 left
   * open) doesn't necessarily know the physician's name the way
   * `registerPhysician`'s own caller does.
   */
  firstName?: string;
  webBaseUrl: string;
}

export interface ResendConfirmationEmailDeps {
  physicianCredentialRepository: PhysicianCredentialRepository;
  emailConfirmationTokenRepository: EmailConfirmationTokenRepository;
  emailSender: EmailSender;
}

/**
 * Self-service resend of the confirmation email (ADR 0015's own
 * "not decided here" item, closed by ADR 0028): a physician who never
 * received their first confirmation email — or let it expire — gets a
 * fresh single-use token without contacting anyone. Deliberately silent
 * for "no such email" and "already confirmed" — same non-leaking
 * posture `login` already uses, since telling a caller which emails are
 * registered would be an account-enumeration primitive this operation
 * has no reason to hand out.
 */
export function resendConfirmationEmail(deps: ResendConfirmationEmailDeps) {
  return async function execute(input: ResendConfirmationEmailInput): Promise<void> {
    const credential = await deps.physicianCredentialRepository.findByEmail(input.email);
    if (!credential || credential.confirmedAt) {
      return;
    }

    await sendConfirmationEmail(deps)({
      physicianId: credential.physicianId,
      email: credential.email,
      firstName: input.firstName ?? "there",
      webBaseUrl: input.webBaseUrl,
    });
  };
}

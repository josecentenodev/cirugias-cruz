import type { EmailConfirmationTokenRepository } from "./email-confirmation-token-repository.js";
import type { EmailSender } from "./email-sender.js";

export interface SendConfirmationEmailInput {
  physicianId: string;
  email: string;
  firstName: string;
  /**
   * `web`'s own public origin (e.g. `https://web-production-....up.railway.app`),
   * supplied by the caller (the HTTP route, which already knows its
   * configured base URL) rather than read from an env var here — this
   * operation stays plain-data-in, plain-data-out, like every other one.
   * The confirmation link is built to point at `web`, never at `api`
   * directly — `api` has no public domain (ADR 0014's BFF pattern).
   */
  webBaseUrl: string;
}

export interface SendConfirmationEmailDeps {
  emailConfirmationTokenRepository: EmailConfirmationTokenRepository;
  emailSender: EmailSender;
}

/**
 * Issues a fresh confirmation token and emails the confirmation link
 * (ADR 0015). Orchestrated by the `POST /physicians` route right after
 * `registerPhysician` succeeds — kept as its own operation, not folded
 * into `registerPhysician`, so that operation's own dependency list
 * doesn't grow to include email sending.
 */
export function sendConfirmationEmail(deps: SendConfirmationEmailDeps) {
  return async function execute(input: SendConfirmationEmailInput): Promise<void> {
    const token = await deps.emailConfirmationTokenRepository.create(input.physicianId);
    const confirmationUrl = `${input.webBaseUrl}/confirm-email?token=${token.id}`;

    await deps.emailSender.send({
      to: input.email,
      subject: "Confirm your Epitaxy account",
      text: `Hi ${input.firstName},\n\nConfirm your Epitaxy account by opening this link:\n${confirmationUrl}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`,
      html:
        `<p>Hi ${input.firstName},</p>` +
        `<p>Confirm your Epitaxy account by clicking the link below:</p>` +
        `<p><a href="${confirmationUrl}">Confirm my account</a></p>` +
        `<p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`,
    });
  };
}

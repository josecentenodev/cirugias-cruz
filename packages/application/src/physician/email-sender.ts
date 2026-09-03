/**
 * Sends transactional email — today, only the account-confirmation email
 * (ADR 0015). Deliberately a thin, provider-agnostic port: nothing here
 * names Resend (the current Infrastructure adapter) or any other
 * provider, so swapping providers later is an Infrastructure-only
 * change, the same way `PasswordHasher` doesn't know it's bcrypt.
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}

/**
 * A single-use, expiring token proving a physician received and clicked
 * the email sent to the address they registered with (ADR 0015).
 * Deliberately shaped like `Session` (`{ id, physicianId, expiresAt }`)
 * — same kind of opaque, server-issued bearer token with a
 * server-controlled expiry, for a different purpose, not a new pattern.
 */
export interface EmailConfirmationToken {
  id: string;
  physicianId: string;
  expiresAt: Date;
}

export interface EmailConfirmationTokenRepository {
  /** Creates and persists a new confirmation token for the given physician. */
  create(physicianId: string): Promise<EmailConfirmationToken>;
  /** Returns the token only if it exists and has not expired. */
  findById(tokenId: string): Promise<EmailConfirmationToken | null>;
  /** Invalidates the token — called once it's been redeemed. */
  delete(tokenId: string): Promise<void>;
}

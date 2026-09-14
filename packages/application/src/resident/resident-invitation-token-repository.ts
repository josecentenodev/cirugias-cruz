/**
 * A single-use, expiring token proving a Resident opened the invitation
 * link emailed to them (ADR 0029). Shaped exactly like
 * `EmailConfirmationToken` (`{ id, residentId, expiresAt }`) — the same
 * kind of opaque, server-issued bearer token, for a different
 * principal/purpose, not a new pattern (ADR 0015's own precedent).
 */
export interface ResidentInvitationToken {
  id: string;
  residentId: string;
  expiresAt: Date;
}

export interface ResidentInvitationTokenRepository {
  /** Creates and persists a new invitation token for the given resident. 7-day lifetime (ADR 0029) — longer than a physician confirmation token's 24 hours. */
  create(residentId: string): Promise<ResidentInvitationToken>;
  /** Returns the token only if it exists and has not expired. */
  findById(tokenId: string): Promise<ResidentInvitationToken | null>;
  /** Invalidates the token — called once it's been redeemed. */
  delete(tokenId: string): Promise<void>;
  /** Invalidates every outstanding token for this resident — called on resend and on deactivation (ADR 0029, decision items 6/8). */
  deleteByResidentId(residentId: string): Promise<void>;
}

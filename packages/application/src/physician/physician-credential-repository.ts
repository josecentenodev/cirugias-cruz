/**
 * Persists the login credential for a Physician — email (used as the
 * authentication identifier, per ADR 0012) and password hash. This is
 * deliberately separate from `PhysicianRepository`: `Physician` (Domain)
 * has no password/credential concept and never will — authentication is
 * an Application/Infrastructure concern layered on top of it, not part
 * of the aggregate. `physicianId` is the stable internal identity passed
 * around everywhere else; `email` never substitutes for it.
 */
export interface PhysicianCredential {
  physicianId: string;
  email: string;
  passwordHash: string;
  /**
   * `null` until the physician has clicked their emailed confirmation
   * link (see ADR 0015) — `login` refuses an unconfirmed credential.
   * Lives here, not on the Domain `Physician` entity, for the same
   * reason `passwordHash` does: authentication state is an Application/
   * Infrastructure concern layered on top of `Physician`, per ADR 0012.
   */
  confirmedAt: Date | null;
}

export interface PhysicianCredentialRepository {
  /** Case-insensitive lookup — email uniqueness is enforced case-insensitively. */
  findByEmail(email: string): Promise<PhysicianCredential | null>;
  save(credential: PhysicianCredential): Promise<void>;
  /** Marks a credential confirmed — idempotent, a no-op if already confirmed. */
  markConfirmed(physicianId: string): Promise<void>;
}

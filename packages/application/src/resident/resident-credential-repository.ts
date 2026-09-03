/**
 * Persists the login credential for a Resident — email (the
 * authentication identifier, same as Physician, ADR 0012) and password
 * hash. Deliberately separate from `ResidentRepository`, for the same
 * reason `PhysicianCredentialRepository` is separate from
 * `PhysicianRepository`: authentication state is an Application/
 * Infrastructure concern layered on top of the Domain `Resident` entity,
 * never part of it.
 *
 * `physicianId` is stored here too (denormalized) purely so this
 * repository can tenant-scope its own reads/writes without a join
 * through `ResidentRepository` — it is never the source of truth for
 * which tenant a Resident belongs to (that's still `Resident.physicianId`
 * in Domain).
 */
export interface ResidentCredential {
  residentId: string;
  physicianId: string;
  email: string;
  passwordHash: string;
  /**
   * The current password in cleartext, but ONLY while it is still the
   * system-generated temporary one the Physician hasn't yet handed off
   * (ADR 0017, decision item 4: the Physician can view it in `web`
   * repeatedly, for as long as it hasn't been changed). This is a
   * deliberate, narrow departure from `PhysicianCredential`'s hash-only
   * posture — see ADR 0017 "Scope of this decision" for why. `null`
   * once the Resident has changed it; the password itself still lives
   * on, hashed, in `passwordHash` — this field stops being the source
   * of truth for what the current password *is* the moment it's no
   * longer temporary, it only tracks "is there still a temporary
   * password worth showing."
   */
  temporaryPassword: string | null;
  /**
   * `true` until the Resident has changed their password at least once.
   * A Resident with `mustChangePassword: true` may authenticate (so they
   * can reach the change-password action) but is blocked from every
   * other Resident-scoped route — enforced in `packages/http`, not here.
   */
  mustChangePassword: boolean;
  /**
   * `false` once the Physician has deactivated this Resident. `login`
   * refuses a deactivated credential even with the correct password.
   */
  active: boolean;
}

export interface ResidentCredentialRepository {
  /** Case-insensitive lookup — email uniqueness is enforced case-insensitively, same as Physician. */
  findByEmail(email: string): Promise<ResidentCredential | null>;
  findByResidentId(residentId: string): Promise<ResidentCredential | null>;
  save(credential: ResidentCredential): Promise<void>;
  /**
   * Records a password the Resident chose themselves: hashes it,
   * clears `temporaryPassword` (nothing valid left to show), and sets
   * `mustChangePassword` to `false`.
   */
  recordPasswordChange(residentId: string, passwordHash: string): Promise<void>;
  /**
   * The Physician-triggered "blanqueo" (ADR 0017, decision item 8):
   * issues a fresh temporary password, re-arming `mustChangePassword`.
   * Same mechanism as initial issuance, just re-triggered on demand.
   */
  reissueTemporaryPassword(
    residentId: string,
    temporaryPassword: string,
    passwordHash: string,
  ): Promise<void>;
  setActive(residentId: string, active: boolean): Promise<void>;
}

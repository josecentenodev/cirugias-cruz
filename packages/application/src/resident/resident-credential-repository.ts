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
  /**
   * `null` until the Resident accepts their invitation and sets their
   * own password (ADR 0029) — there is no system-generated password to
   * fall back on, unlike the temporary-password mechanism this
   * replaced. "Has this Resident accepted?" is exactly "is this set?" —
   * see ADR 0029's "Technical representation" for why no separate
   * status field exists.
   */
  passwordHash: string | null;
  /** When the current (still-pending or already-superseded) invitation was sent. Status/UI display only (ADR 0029, decision item 5) — never used for access control. */
  invitedAt: Date;
  /** When the Resident accepted their invitation and set a password. `null` while `passwordHash` is `null`. Display only, same as `invitedAt`. */
  acceptedAt: Date | null;
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
   * Records a password the already-logged-in Resident chose to change
   * to voluntarily — distinct from `recordInvitationAccepted` below,
   * which is what sets the *first* password. Doesn't touch
   * `acceptedAt`.
   */
  recordPasswordChange(residentId: string, passwordHash: string): Promise<void>;
  /**
   * Records that this Resident accepted a pending invitation by setting
   * their first password (ADR 0029, decision item 4) — distinct from
   * `recordPasswordChange` in that it also stamps `acceptedAt`.
   */
  recordInvitationAccepted(
    residentId: string,
    passwordHash: string,
    acceptedAt: Date,
  ): Promise<void>;
  /**
   * The Physician-triggered "resend invitation" (ADR 0029, decision item
   * 6 — replaces 0017's "blanqueo"): clears `passwordHash` back to
   * unset and `acceptedAt` back to `null`, and stamps a fresh
   * `invitedAt`. There is no valid credential left until the Resident
   * accepts again — a deliberate tightening over the mechanism this
   * replaced.
   */
  recordInvitationResent(residentId: string, invitedAt: Date): Promise<void>;
  setActive(residentId: string, active: boolean): Promise<void>;
}

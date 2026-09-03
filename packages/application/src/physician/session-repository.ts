/**
 * Server-side session storage — PostgreSQL for the MVP, per the approved
 * decision. A session is an opaque identifier resolving to a principal
 * (Physician or Resident, since ADR 0017), with a server-controlled
 * expiry. Nothing about "session" belongs in Domain: it is purely an
 * authentication-infrastructure concept.
 *
 * `physicianId` is always the tenant — populated identically for both
 * `userType`s, since a Resident belongs to exactly one Physician. Every
 * existing tenant-scoping check in `packages/http`'s routes keeps
 * reading `physicianId` unchanged; `userType`/`residentId` are only
 * consulted where a Resident's narrower access (ADR 0017) actually
 * differs. `residentId` is present if and only if `userType ===
 * "resident"` — see docs/decisions/0017 "Technical representation" for
 * why this shape was chosen over a discriminated union or a parallel
 * `ResidentSession` concept.
 */
export interface Session {
  id: string;
  userType: "physician" | "resident";
  physicianId: string;
  residentId: string | null;
  expiresAt: Date;
}

export type CreateSessionInput =
  | { userType: "physician"; physicianId: string }
  | { userType: "resident"; physicianId: string; residentId: string };

export interface SessionRepository {
  /** Creates and persists a new session for the given principal. */
  create(input: CreateSessionInput): Promise<Session>;
  /** Returns the session only if it exists and has not expired. */
  findById(sessionId: string): Promise<Session | null>;
  delete(sessionId: string): Promise<void>;
  /**
   * Invalidates every session currently held by a Resident — used when a
   * Physician deactivates them (ADR 0017: deactivation forces the
   * immediate closure of any open session, not just future logins).
   */
  deleteByResidentId(residentId: string): Promise<void>;
}

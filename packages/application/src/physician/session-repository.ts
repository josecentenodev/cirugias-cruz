/**
 * Server-side session storage — PostgreSQL for the MVP, per the approved
 * decision. A session is an opaque identifier resolving to a physicianId,
 * with a server-controlled expiry. Nothing about "session" belongs in
 * Domain: it is purely an authentication-infrastructure concept.
 */
export interface Session {
  id: string;
  physicianId: string;
  expiresAt: Date;
}

export interface SessionRepository {
  /** Creates and persists a new session for the given physician. */
  create(physicianId: string): Promise<Session>;
  /** Returns the session only if it exists and has not expired. */
  findById(sessionId: string): Promise<Session | null>;
  delete(sessionId: string): Promise<void>;
}

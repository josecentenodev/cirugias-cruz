import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionRepository } from "@cirugias-cruz/application";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * The authenticated principal's tenant id, set only by `requireAuth`
     * after resolving the session cookie. Never trust any other source
     * (body/params/query) for tenant identity — see
     * docs/architecture/ROADMAP.md and the Milestone 3 decisions.
     *
     * Populated identically for both `userType`s (ADR 0017) — a
     * Resident's own tenant is the Physician they belong to, so every
     * existing tenant-scoping check that reads `physicianId` keeps
     * working unchanged for a Resident session too.
     */
    physicianId?: string;
    /** "physician" or "resident" — which kind of principal this session belongs to (ADR 0017). Set only by `requireAuth`. */
    userType?: "physician" | "resident";
    /** Set only when `userType === "resident"`. Never trust a client-supplied residentId for authorization — always this. */
    residentId?: string;
  }
}

/**
 * A Fastify `preHandler` that resolves the session cookie to a real,
 * currently-valid principal (Physician or Resident, ADR 0017) before a
 * protected route runs. On failure it replies 401 and short-circuits —
 * the route handler never executes. This is the *only* place
 * `request.physicianId`/`userType`/`residentId` are set.
 *
 * This alone does not restrict *which kind* of principal may proceed —
 * see `requirePhysicianAuth`/`requireResidentAuth` for that. Use this
 * directly only for a route deliberately open to both (e.g. recording a
 * Control).
 */
export function requireAuth(sessionRepository: SessionRepository) {
  return async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      await reply.code(401).send({ error: "Not authenticated" });
      return;
    }

    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      await reply.code(401).send({ error: "Not authenticated" });
      return;
    }

    request.physicianId = session.physicianId;
    request.userType = session.userType;
    request.residentId = session.residentId ?? undefined;
  };
}

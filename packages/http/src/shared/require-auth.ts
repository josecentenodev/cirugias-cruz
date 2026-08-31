import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionRepository } from "@cirugias-cruz/application";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * The authenticated physician's tenant id, set only by `requireAuth`
     * after resolving the session cookie. Never trust any other source
     * (body/params/query) for tenant identity — see
     * docs/architecture/ROADMAP.md and the Milestone 3 decisions.
     */
    physicianId?: string;
  }
}

/**
 * A Fastify `preHandler` that resolves the session cookie to a real,
 * currently-valid Physician identity before a protected route runs. On
 * failure it replies 401 and short-circuits — the route handler never
 * executes. This is the *only* place `request.physicianId` is set.
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
  };
}

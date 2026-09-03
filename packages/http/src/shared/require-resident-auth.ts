import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionRepository } from "@cirugias-cruz/application";
import { requireAuth } from "./require-auth.js";

/**
 * Rejects a Physician session with the same 401 shape as no session at
 * all — mirrors `requirePhysicianAuth`'s reasoning in the other
 * direction. Does NOT enforce the mandatory-password-change rule
 * (ADR 0017) — that's `requireResidentPasswordChanged`, applied
 * separately so the "change my password" route itself can skip it.
 */
export function requireResidentAuth(sessionRepository: SessionRepository) {
  const authenticate = requireAuth(sessionRepository);

  return async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) {
      return;
    }

    if (request.userType !== "resident") {
      await reply.code(401).send({ error: "Not authenticated" });
    }
  };
}

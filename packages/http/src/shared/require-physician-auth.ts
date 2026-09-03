import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionRepository } from "@cirugias-cruz/application";
import { requireAuth } from "./require-auth.js";

/**
 * Every route that existed before ADR 0017 is Physician-only — a
 * Resident's access is deliberately narrower and explicitly enumerated
 * (Surgery panel + Control create/edit-own), never inherited by
 * default. Wraps `requireAuth`: resolves the session exactly the same
 * way, then rejects a Resident session with the same 401 shape as no
 * session at all — a Resident isn't authenticated *for this resource*,
 * which is what 401 already means everywhere else in this API (this
 * project deliberately has no 403; see routes/resident.ts and
 * docs/architecture/m4-m7-conformance-review.md).
 */
export function requirePhysicianAuth(sessionRepository: SessionRepository) {
  const authenticate = requireAuth(sessionRepository);

  return async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) {
      return;
    }

    if (request.userType !== "physician") {
      await reply.code(401).send({ error: "Not authenticated" });
    }
  };
}

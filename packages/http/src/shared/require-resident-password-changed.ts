import type { FastifyReply, FastifyRequest } from "fastify";
import type { ResidentCredentialRepository } from "@cirugias-cruz/application";

/**
 * Blocks every Resident-scoped route EXCEPT "change my password" while
 * the Resident still hasn't changed their system-issued temporary
 * password (ADR 0017, decision item 3: mandatory on first login). Must
 * run after `requireResidentAuth` — depends on `request.residentId`.
 * A 400 with a clear message, same shape as any other expectable
 * `DomainError` this API returns — not a 401 (they ARE authenticated)
 * and not a 403 (this API has none).
 */
export function requireResidentPasswordChanged(
  residentCredentialRepository: ResidentCredentialRepository,
) {
  return async function handler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const credential = await residentCredentialRepository.findByResidentId(
      request.residentId as string,
    );
    if (credential?.mustChangePassword) {
      await reply
        .code(400)
        .send({ error: "Please change your temporary password before continuing" });
    }
  };
}

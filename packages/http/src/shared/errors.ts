import { DomainError } from "@cirugias-cruz/domain";
import { NotFoundError } from "@cirugias-cruz/application";
import type { FastifyReply } from "fastify";

/**
 * Translates Application/Domain errors into HTTP responses. This is the
 * one place that knows about status codes — Application and Domain never
 * see an HTTP status, and this file never leaks back into them (only
 * imports their error types).
 */
export function replyForError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof DomainError) {
    return reply.code(400).send({ error: error.message });
  }
  if (error instanceof NotFoundError) {
    return reply.code(404).send({ error: error.message });
  }

  console.error(error);
  return reply.code(500).send({ error: "Internal server error" });
}

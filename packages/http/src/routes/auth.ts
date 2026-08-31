import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { login, logout, registerPhysician } from "@cirugias-cruz/application";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../shared/session-cookie.js";

interface RegisterPhysicianBody {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  password: string;
  metadata?: Record<string, unknown>;
}

interface LoginBody {
  email: string;
  password: string;
}

export function registerAuthRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post<{ Body: RegisterPhysicianBody }>("/physicians", async (request, reply) => {
    try {
      const output = await registerPhysician(deps)({
        id: randomUUID(),
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        phone: request.body.phone,
        email: request.body.email,
        dateOfBirth: new Date(request.body.dateOfBirth),
        password: request.body.password,
        metadata: request.body.metadata,
      });
      return await reply.code(201).send(output);
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.post<{ Body: LoginBody }>("/sessions", async (request, reply) => {
    try {
      const session = await login(deps)({
        email: request.body.email,
        password: request.body.password,
      });
      reply.setCookie(SESSION_COOKIE_NAME, session.id, sessionCookieOptions(session.expiresAt));
      return reply.code(204).send();
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.delete("/sessions", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await logout(deps)({ sessionId });
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });
}

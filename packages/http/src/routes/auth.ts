import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  confirmPhysicianEmail,
  login,
  logout,
  registerPhysician,
  sendConfirmationEmail,
} from "@cirugias-cruz/application";
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

interface ConfirmEmailBody {
  token: string;
}

/**
 * Structural (shape/type) validation only — this rejects malformed
 * payloads before they reach Application, it does not reimplement any
 * Domain business rule (e.g. "firstName non-empty" stays owned by
 * `Person.create` in Domain; see docs/architecture/ROADMAP.md
 * Milestone 7).
 */
const registerPhysicianBodySchema = {
  type: "object",
  required: ["firstName", "lastName", "phone", "email", "dateOfBirth", "password"],
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    phone: { type: "string" },
    email: { type: "string" },
    dateOfBirth: { type: "string" },
    password: { type: "string" },
    metadata: { type: "object" },
  },
} as const;

const loginBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string" },
    password: { type: "string" },
  },
} as const;

const confirmEmailBodySchema = {
  type: "object",
  required: ["token"],
  properties: {
    token: { type: "string" },
  },
} as const;

// Rate limits, per docs/architecture/ROADMAP.md Milestone 7: both routes
// are brute-force/abuse targets (login attempts, mass registration). Keyed
// on the forwarded client IP — see build-app.ts and
// shared/rate-limit-key.ts for why the default (raw connection IP) key
// would be wrong for this BFF topology.
const authRateLimit = { max: 5, timeWindow: "1 minute" };

export function registerAuthRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post<{ Body: RegisterPhysicianBody }>(
    "/physicians",
    {
      schema: { body: registerPhysicianBodySchema },
      config: { rateLimit: authRateLimit },
    },
    async (request, reply) => {
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
        // ADR 0015: registration alone doesn't grant a usable account —
        // the confirmation email is what makes login possible at all.
        // Sent after `registerPhysician` succeeds, deliberately not
        // inside it (keeps that operation's own dependency list
        // unchanged; see send-confirmation-email.ts). A send failure
        // (e.g. Resend misconfigured/down) is logged but does not fail
        // the registration response itself — the physician account is
        // real either way, and a hard 500 here would make an email
        // provider outage brick account creation entirely. The physician
        // is left unable to log in until the email problem is resolved;
        // there is no self-service resend yet (tracked in ADR 0015 as a
        // fast-follow, not blocking).
        try {
          await sendConfirmationEmail(deps)({
            physicianId: output.physicianId,
            email: request.body.email,
            firstName: request.body.firstName,
            webBaseUrl: deps.webBaseUrl,
          });
        } catch (error) {
          request.log.error(
            { err: error, physicianId: output.physicianId },
            "Failed to send confirmation email",
          );
        }
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Body: ConfirmEmailBody }>(
    "/email-confirmations",
    {
      schema: { body: confirmEmailBodySchema },
      config: { rateLimit: authRateLimit },
    },
    async (request, reply) => {
      try {
        const output = await confirmPhysicianEmail(deps)({ token: request.body.token });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Body: LoginBody }>(
    "/sessions",
    {
      schema: { body: loginBodySchema },
      config: { rateLimit: authRateLimit },
    },
    async (request, reply) => {
      try {
        const session = await login(deps)({
          email: request.body.email,
          password: request.body.password,
        });
        reply.setCookie(SESSION_COOKIE_NAME, session.id, sessionCookieOptions(session.expiresAt));

        // web needs to know which kind of principal just logged in (and,
        // for a Resident, whether they still must change their temporary
        // password) to redirect to the right place — ADR 0017. Physician
        // logins keep the same 200-with-a-small-body shape rather than
        // the previous bare 204, so `web` has one response shape to
        // parse regardless of who logged in.
        if (session.userType === "resident") {
          const credential = await deps.residentCredentialRepository.findByResidentId(
            session.residentId as string,
          );
          return await reply.code(200).send({
            userType: "resident",
            mustChangePassword: credential?.mustChangePassword ?? false,
          });
        }
        return await reply.code(200).send({ userType: "physician" });
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.delete("/sessions", async (request, reply) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await logout(deps)({ sessionId });
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });
}

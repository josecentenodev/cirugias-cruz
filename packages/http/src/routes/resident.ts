import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  assignResidentToSurgery,
  changeResidentPassword,
  getResident,
  getSurgeryForResident,
  listResidents,
  listSurgeriesForResident,
  registerResident,
  removeResidentFromSurgery,
  resetResidentPassword,
  setResidentActive,
  viewResidentTemporaryPassword,
} from "@cirugias-cruz/application";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { requirePhysicianAuth } from "../shared/require-physician-auth.js";
import { requireResidentAuth } from "../shared/require-resident-auth.js";
import { requireResidentPasswordChanged } from "../shared/require-resident-password-changed.js";
import { serializeSurgery } from "./core-loop.js";

interface RegisterResidentBody {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  metadata?: Record<string, unknown>;
}

interface AssignResidentBody {
  residentId: string;
}

interface SetActiveBody {
  active: boolean;
}

interface ChangePasswordBody {
  newPassword: string;
}

/**
 * Structural (shape/type) validation only, per docs/architecture/ROADMAP.md
 * Milestone 7 — rejects malformed payloads before Application ever sees
 * them. Business invariants stay owned by Domain/Application and are not
 * duplicated here. Mirrors the schema style already established in
 * routes/core-loop.ts and routes/auth.ts.
 */
const registerResidentBodySchema = {
  type: "object",
  required: ["firstName", "lastName", "phone", "email", "dateOfBirth"],
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    phone: { type: "string" },
    email: { type: "string" },
    dateOfBirth: { type: "string" },
    metadata: { type: "object" },
  },
} as const;

const residentIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string" } },
} as const;

const surgeryIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string" } },
} as const;

const surgeryResidentParamsSchema = {
  type: "object",
  required: ["id", "residentId"],
  properties: { id: { type: "string" }, residentId: { type: "string" } },
} as const;

const assignResidentBodySchema = {
  type: "object",
  required: ["residentId"],
  properties: { residentId: { type: "string" } },
} as const;

const setActiveBodySchema = {
  type: "object",
  required: ["active"],
  properties: { active: { type: "boolean" } },
} as const;

const changePasswordBodySchema = {
  type: "object",
  required: ["newPassword"],
  properties: { newPassword: { type: "string" } },
} as const;

function toResidentDto(resident: {
  id: string;
  physicianId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: Date;
  metadata?: Record<string, unknown>;
}) {
  return {
    id: resident.id,
    physicianId: resident.physicianId,
    firstName: resident.firstName,
    lastName: resident.lastName,
    phone: resident.phone,
    email: resident.email,
    dateOfBirth: resident.dateOfBirth.toISOString(),
    metadata: resident.metadata,
  };
}

/**
 * Resident vertical slice, reached over HTTP — Milestone 5's original
 * physician-management routes, plus ADR 0017's own login/self-service
 * for the Resident as a principal in their own right.
 *
 * Two auth postures live in this one file:
 * - `physicianAuth` — the Physician managing their Residents (create,
 *   list, get, assign/remove from a Surgery, view/reset the temporary
 *   password, activate/deactivate). Unchanged in spirit from Milestone 5.
 * - `residentAuth` (`/me/...`) — a Resident acting as themselves: their
 *   own Surgery panel (read-only; Control create/edit lives in
 *   routes/core-loop.ts, shared with the Physician) and changing their
 *   own password. `requireResidentPasswordChanged` gates every one of
 *   these EXCEPT changing the password itself — see ADR 0017, decision
 *   item 3.
 */
export function registerResidentRoutes(app: FastifyInstance, deps: AppDeps): void {
  const physicianAuth = { preHandler: requirePhysicianAuth(deps.sessionRepository) };
  const residentAuth = { preHandler: requireResidentAuth(deps.sessionRepository) };

  app.post<{ Body: RegisterResidentBody }>(
    "/residents",
    { ...physicianAuth, schema: { body: registerResidentBodySchema } },
    async (request, reply) => {
      try {
        const output = await registerResident(deps)({
          physicianId: request.physicianId as string,
          id: randomUUID(),
          firstName: request.body.firstName,
          lastName: request.body.lastName,
          phone: request.body.phone,
          email: request.body.email,
          dateOfBirth: new Date(request.body.dateOfBirth),
          metadata: request.body.metadata,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.get("/residents", physicianAuth, async (request, reply) => {
    try {
      const residents = await listResidents(deps)({
        physicianId: request.physicianId as string,
      });
      return await reply.code(200).send(residents.map(toResidentDto));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/residents/:id",
    { ...physicianAuth, schema: { params: residentIdParamsSchema } },
    async (request, reply) => {
      try {
        const resident = await getResident(deps)({
          physicianId: request.physicianId as string,
          residentId: request.params.id,
        });
        return await reply.code(200).send(toResidentDto(resident));
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/residents/:id/temporary-password",
    { ...physicianAuth, schema: { params: residentIdParamsSchema } },
    async (request, reply) => {
      try {
        const output = await viewResidentTemporaryPassword(deps)({
          physicianId: request.physicianId as string,
          residentId: request.params.id,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/residents/:id/password-reset",
    { ...physicianAuth, schema: { params: residentIdParamsSchema } },
    async (request, reply) => {
      try {
        const output = await resetResidentPassword(deps)({
          physicianId: request.physicianId as string,
          residentId: request.params.id,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: SetActiveBody }>(
    "/residents/:id/active",
    { ...physicianAuth, schema: { params: residentIdParamsSchema, body: setActiveBodySchema } },
    async (request, reply) => {
      try {
        await setResidentActive(deps)({
          physicianId: request.physicianId as string,
          residentId: request.params.id,
          active: request.body.active,
        });
        return await reply.code(204).send();
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Params: { id: string }; Body: AssignResidentBody }>(
    "/surgeries/:id/residents",
    {
      ...physicianAuth,
      schema: { params: surgeryIdParamsSchema, body: assignResidentBodySchema },
    },
    async (request, reply) => {
      try {
        const output = await assignResidentToSurgery(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.id,
          residentId: request.body.residentId,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.delete<{ Params: { id: string; residentId: string } }>(
    "/surgeries/:id/residents/:residentId",
    { ...physicianAuth, schema: { params: surgeryResidentParamsSchema } },
    async (request, reply) => {
      try {
        const output = await removeResidentFromSurgery(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.id,
          residentId: request.params.residentId,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  // --- A Resident acting as themselves (ADR 0017) ---

  // Lets `web` learn its own residentId — the session cookie is opaque
  // by design (BFF pattern), so this is the one read that closes the
  // gap for anything client-side that needs to compare "is this control
  // mine" (e.g. showing an Edit button only where it would actually be
  // allowed). Not gated by requireResidentPasswordChanged — knowing who
  // you are isn't gated on having changed your password.
  app.get("/me", residentAuth, async (request, reply) => {
    return reply.code(200).send({ residentId: request.residentId as string });
  });

  app.patch<{ Body: ChangePasswordBody }>(
    "/me/password",
    { ...residentAuth, schema: { body: changePasswordBodySchema } },
    async (request, reply) => {
      try {
        await changeResidentPassword(deps)({
          residentId: request.residentId as string,
          newPassword: request.body.newPassword,
        });
        return await reply.code(204).send();
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.get("/me/surgeries", residentAuth, async (request, reply) => {
    try {
      await requireResidentPasswordChanged(deps.residentCredentialRepository)(request, reply);
      if (reply.sent) {
        return reply;
      }

      const surgeries = await listSurgeriesForResident(deps)({
        residentId: request.residentId as string,
      });
      return await reply.code(200).send(surgeries.map(serializeSurgery));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/me/surgeries/:id",
    { ...residentAuth, schema: { params: surgeryIdParamsSchema } },
    async (request, reply) => {
      try {
        await requireResidentPasswordChanged(deps.residentCredentialRepository)(request, reply);
        if (reply.sent) {
          return reply;
        }

        const surgery = await getSurgeryForResident(deps)({
          residentId: request.residentId as string,
          surgeryId: request.params.id,
        });
        return await reply.code(200).send(serializeSurgery(surgery));
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );
}

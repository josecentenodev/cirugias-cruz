import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  assignResidentToSurgery,
  registerResident,
  removeResidentFromSurgery,
} from "@cirugias-cruz/application";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { requireAuth } from "../shared/require-auth.js";

interface RegisterResidentBody {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  metadata?: Record<string, unknown>;
}

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
 * Milestone 5 — Resident vertical slice, reached over HTTP. Every handler
 * takes `request.physicianId` — set only by requireAuth from the
 * authenticated session — as the tenant. No route ever reads a
 * physicianId from the request body/params/query.
 */
export function registerResidentRoutes(app: FastifyInstance, deps: AppDeps): void {
  const auth = { preHandler: requireAuth(deps.sessionRepository) };

  app.post<{ Body: RegisterResidentBody }>("/residents", auth, async (request, reply) => {
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
  });

  app.get("/residents", auth, async (request, reply) => {
    try {
      const residents = await deps.residentRepository.findByPhysicianId(
        request.physicianId as string,
      );
      return await reply.code(200).send(residents.map(toResidentDto));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>("/residents/:id", auth, async (request, reply) => {
    try {
      const resident = await deps.residentRepository.findById(request.params.id);
      if (!resident || resident.physicianId !== request.physicianId) {
        return await reply.code(404).send({ error: `Resident ${request.params.id} was not found` });
      }
      return await reply.code(200).send(toResidentDto(resident));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.post<{ Params: { id: string }; Body: { residentId: string } }>(
    "/surgeries/:id/residents",
    auth,
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
    auth,
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
}

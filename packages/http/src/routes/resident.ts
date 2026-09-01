import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  assignResidentToSurgery,
  getResident,
  listResidents,
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

interface AssignResidentBody {
  residentId: string;
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
 *
 * Reads go through `listResidents`/`getResident` (Application), the same
 * as every other resource's read routes in routes/core-loop.ts — see
 * docs/architecture/m4-m7-conformance-review.md §2.2 for why this was
 * corrected from calling `ResidentRepository` directly.
 */
export function registerResidentRoutes(app: FastifyInstance, deps: AppDeps): void {
  const auth = { preHandler: requireAuth(deps.sessionRepository) };

  app.post<{ Body: RegisterResidentBody }>(
    "/residents",
    { ...auth, schema: { body: registerResidentBodySchema } },
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

  app.get("/residents", auth, async (request, reply) => {
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
    { ...auth, schema: { params: residentIdParamsSchema } },
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

  app.post<{ Params: { id: string }; Body: AssignResidentBody }>(
    "/surgeries/:id/residents",
    { ...auth, schema: { params: surgeryIdParamsSchema, body: assignResidentBodySchema } },
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
    { ...auth, schema: { params: surgeryResidentParamsSchema } },
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

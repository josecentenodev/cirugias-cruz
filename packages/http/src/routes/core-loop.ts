import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  modifyControl,
  recordControl,
  registerPatient,
  registerProcedureType,
  registerSurgery,
} from "@cirugias-cruz/application";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { requireAuth } from "../shared/require-auth.js";

interface RegisterPatientBody {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  metadata?: Record<string, unknown>;
  observations?: string;
}

interface RegisterProcedureTypeBody {
  name: string;
  description?: string;
  technique?: string;
}

interface RegisterSurgeryBody {
  patientId: string;
  procedureTypeId: string;
  performedAt: string;
}

interface RecordControlBody {
  observations: string;
  recordedAt: string;
  author: { type: "physician" } | { type: "resident"; residentId: string };
}

interface ModifyControlBody {
  observations?: string;
  recordedAt?: string;
}

/**
 * The Milestone 1 operations, reached over HTTP. Every handler here does
 * exactly one thing beyond translation: take `request.physicianId` — set
 * only by `requireAuth` from the authenticated session — as the tenant
 * for the underlying Application operation. No route ever reads a
 * physicianId from the request body/params/query.
 */
export function registerCoreLoopRoutes(app: FastifyInstance, deps: AppDeps): void {
  const auth = { preHandler: requireAuth(deps.sessionRepository) };

  app.post<{ Body: RegisterPatientBody }>("/patients", auth, async (request, reply) => {
    try {
      const output = await registerPatient(deps)({
        physicianId: request.physicianId as string,
        id: randomUUID(),
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        phone: request.body.phone,
        email: request.body.email,
        dateOfBirth: new Date(request.body.dateOfBirth),
        metadata: request.body.metadata,
        observations: request.body.observations,
      });
      return await reply.code(201).send(output);
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.post<{ Body: RegisterProcedureTypeBody }>(
    "/procedure-types",
    auth,
    async (request, reply) => {
      try {
        const output = await registerProcedureType(deps)({
          physicianId: request.physicianId as string,
          id: randomUUID(),
          name: request.body.name,
          description: request.body.description,
          technique: request.body.technique,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Body: RegisterSurgeryBody }>("/surgeries", auth, async (request, reply) => {
    try {
      const output = await registerSurgery(deps)({
        physicianId: request.physicianId as string,
        id: randomUUID(),
        patientId: request.body.patientId,
        procedureTypeId: request.body.procedureTypeId,
        performedAt: new Date(request.body.performedAt),
      });
      return await reply.code(201).send(output);
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.post<{ Params: { surgeryId: string }; Body: RecordControlBody }>(
    "/surgeries/:surgeryId/controls",
    auth,
    async (request, reply) => {
      try {
        const output = await recordControl(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.surgeryId,
          id: randomUUID(),
          observations: request.body.observations,
          recordedAt: new Date(request.body.recordedAt),
          author: request.body.author,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.patch<{ Params: { surgeryId: string; controlId: string }; Body: ModifyControlBody }>(
    "/surgeries/:surgeryId/controls/:controlId",
    auth,
    async (request, reply) => {
      try {
        const output = await modifyControl(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.surgeryId,
          controlId: request.params.controlId,
          changes: {
            observations: request.body.observations,
            recordedAt: request.body.recordedAt ? new Date(request.body.recordedAt) : undefined,
          },
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );
}

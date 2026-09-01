import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  addSurgeryToResearchStudy,
  completeResearchStudy,
  createResearchStudy,
  deleteResearchStudy,
  getResearchStudy,
  listResearchStudies,
  moveResearchStudyToInProgress,
  removeSurgeryFromResearchStudy,
  reopenResearchStudy,
  updateAnalysis,
  updateConclusion,
  updateHypothesis,
  updateResults,
} from "@cirugias-cruz/application";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { requireAuth } from "../shared/require-auth.js";

interface CreateResearchStudyBody {
  hypothesis?: string;
  results?: string;
  analysis?: string;
  conclusion?: string;
}

interface UpdateResearchStudyBody {
  hypothesis?: string;
  results?: string;
  analysis?: string;
  conclusion?: string;
}

interface AddSurgeryBody {
  surgeryId: string;
}

interface StatusBody {
  to?: string;
}

/**
 * Structural (shape/type) validation only, per docs/architecture/ROADMAP.md
 * Milestone 7 — rejects malformed payloads (including a missing/empty
 * body) before Application ever sees them. Business invariants (e.g.
 * "hypothesis" has no non-empty rule in Domain) stay owned by Domain and
 * are not duplicated here. Every field here is optional at the Domain
 * level (see ResearchStudy.create/updateHypothesis etc.), so `required`
 * is intentionally empty on the text-field bodies — the schema's job is
 * only to guarantee the body itself is a well-formed object (rejecting
 * a missing/non-object body — see
 * docs/architecture/m4-m7-conformance-review.md §2.1 for the concrete
 * 500 this closes), and that any field present has the right type.
 */
const researchStudyTextFieldsBodySchema = {
  type: "object",
  properties: {
    hypothesis: { type: "string" },
    results: { type: "string" },
    analysis: { type: "string" },
    conclusion: { type: "string" },
  },
} as const;

const addSurgeryBodySchema = {
  type: "object",
  required: ["surgeryId"],
  properties: {
    surgeryId: { type: "string" },
  },
} as const;

const statusBodySchema = {
  type: "object",
  required: ["to"],
  properties: {
    to: { type: "string" },
  },
} as const;

const researchStudyIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string" } },
} as const;

const researchStudySurgeryParamsSchema = {
  type: "object",
  required: ["id", "surgeryId"],
  properties: { id: { type: "string" }, surgeryId: { type: "string" } },
} as const;

/**
 * Research Study routes. Every route is requireAuth-protected and takes
 * tenant identity only from `request.physicianId` (set by requireAuth from
 * the session cookie) — never from the request body/params/query.
 *
 * POST /research-studies/:id/status maps its `{ to }` body onto exactly
 * one of the three real Domain transition methods, based on the study's
 * *current* status (loaded server-side, never trusted from the client):
 *   - current DRAFT,       to "IN_PROGRESS" -> moveToInProgress
 *   - current IN_PROGRESS, to "COMPLETED"   -> complete
 *   - current COMPLETED,   to "IN_PROGRESS" -> reopen
 * Any other { current, to } combination is rejected as a bad request
 * before any Domain method is called — the client never selects a method
 * name directly, only the state it wants to reach. This routing lives
 * here deliberately (not a Domain-rule duplication — see
 * docs/architecture/m4-m7-conformance-review.md §2.4).
 */
export function registerResearchStudyRoutes(app: FastifyInstance, deps: AppDeps): void {
  const auth = { preHandler: requireAuth(deps.sessionRepository) };

  app.post<{ Body: CreateResearchStudyBody }>(
    "/research-studies",
    { ...auth, schema: { body: researchStudyTextFieldsBodySchema } },
    async (request, reply) => {
      try {
        const output = await createResearchStudy(deps)({
          physicianId: request.physicianId as string,
          id: randomUUID(),
          hypothesis: request.body.hypothesis,
          results: request.body.results,
          analysis: request.body.analysis,
          conclusion: request.body.conclusion,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.get("/research-studies", auth, async (request, reply) => {
    try {
      const output = await listResearchStudies(deps)({
        physicianId: request.physicianId as string,
      });
      return await reply.code(200).send(output);
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/research-studies/:id",
    { ...auth, schema: { params: researchStudyIdParamsSchema } },
    async (request, reply) => {
      try {
        const output = await getResearchStudy(deps)({
          physicianId: request.physicianId as string,
          researchStudyId: request.params.id,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateResearchStudyBody }>(
    "/research-studies/:id",
    {
      ...auth,
      schema: { params: researchStudyIdParamsSchema, body: researchStudyTextFieldsBodySchema },
    },
    async (request, reply) => {
      try {
        const physicianId = request.physicianId as string;
        const researchStudyId = request.params.id;

        if (request.body.hypothesis !== undefined) {
          await updateHypothesis(deps)({
            physicianId,
            researchStudyId,
            hypothesis: request.body.hypothesis,
          });
        }
        if (request.body.results !== undefined) {
          await updateResults(deps)({
            physicianId,
            researchStudyId,
            results: request.body.results,
          });
        }
        if (request.body.analysis !== undefined) {
          await updateAnalysis(deps)({
            physicianId,
            researchStudyId,
            analysis: request.body.analysis,
          });
        }
        if (request.body.conclusion !== undefined) {
          await updateConclusion(deps)({
            physicianId,
            researchStudyId,
            conclusion: request.body.conclusion,
          });
        }

        const output = await getResearchStudy(deps)({ physicianId, researchStudyId });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Params: { id: string }; Body: AddSurgeryBody }>(
    "/research-studies/:id/surgeries",
    { ...auth, schema: { params: researchStudyIdParamsSchema, body: addSurgeryBodySchema } },
    async (request, reply) => {
      try {
        const output = await addSurgeryToResearchStudy(deps)({
          physicianId: request.physicianId as string,
          researchStudyId: request.params.id,
          surgeryId: request.body.surgeryId,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.delete<{ Params: { id: string; surgeryId: string } }>(
    "/research-studies/:id/surgeries/:surgeryId",
    { ...auth, schema: { params: researchStudySurgeryParamsSchema } },
    async (request, reply) => {
      try {
        const output = await removeSurgeryFromResearchStudy(deps)({
          physicianId: request.physicianId as string,
          researchStudyId: request.params.id,
          surgeryId: request.params.surgeryId,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Params: { id: string }; Body: StatusBody }>(
    "/research-studies/:id/status",
    { ...auth, schema: { params: researchStudyIdParamsSchema, body: statusBodySchema } },
    async (request, reply) => {
      try {
        const physicianId = request.physicianId as string;
        const researchStudyId = request.params.id;
        const to = request.body.to;

        if (to !== "IN_PROGRESS" && to !== "COMPLETED") {
          return await reply
            .code(400)
            .send({ error: 'Body "to" must be "IN_PROGRESS" or "COMPLETED"' });
        }

        const current = await getResearchStudy(deps)({ physicianId, researchStudyId });

        let output;
        if (current.status === "DRAFT" && to === "IN_PROGRESS") {
          output = await moveResearchStudyToInProgress(deps)({ physicianId, researchStudyId });
        } else if (current.status === "IN_PROGRESS" && to === "COMPLETED") {
          output = await completeResearchStudy(deps)({ physicianId, researchStudyId });
        } else if (current.status === "COMPLETED" && to === "IN_PROGRESS") {
          output = await reopenResearchStudy(deps)({ physicianId, researchStudyId });
        } else {
          return await reply
            .code(400)
            .send({ error: `Cannot move a ${current.status} research study to ${to}` });
        }

        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/research-studies/:id",
    { ...auth, schema: { params: researchStudyIdParamsSchema } },
    async (request, reply) => {
      try {
        const output = await deleteResearchStudy(deps)({
          physicianId: request.physicianId as string,
          researchStudyId: request.params.id,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );
}

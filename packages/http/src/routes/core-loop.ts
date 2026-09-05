import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  addCustomField,
  getPatient,
  getProcedureType,
  getSurgery,
  listPatients,
  listProcedureTypes,
  listSurgeries,
  modifyControl,
  modifyProcedureType,
  recordControl,
  registerPatient,
  registerProcedureType,
  registerSurgery,
} from "@cirugias-cruz/application";
import type { Patient, ProcedureType, Surgery } from "@cirugias-cruz/domain";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { requireAuth } from "../shared/require-auth.js";
import { requirePhysicianAuth } from "../shared/require-physician-auth.js";
import { requireResidentPasswordChanged } from "../shared/require-resident-password-changed.js";

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

interface ModifyProcedureTypeBody {
  name?: string;
  description?: string;
  technique?: string;
}

type CustomFieldConstraintBody =
  | { valueType: "NUMBER"; unit?: string; min?: number; max?: number }
  | { valueType: "ENUM"; options: string[] }
  | { valueType: "TEXT"; maxLength?: number }
  | { valueType: "DATE"; min?: string; max?: string };

interface AddCustomFieldBody {
  name: string;
  description?: string;
  scope: "SURGERY" | "CONTROL";
  constraint: CustomFieldConstraintBody;
}

interface CustomFieldValueBody {
  definitionId: string;
  value: string | number;
}

interface RegisterSurgeryBody {
  patientId: string;
  procedureTypeId: string;
  performedAt: string;
  customFieldValues?: CustomFieldValueBody[];
}

interface RecordControlBody {
  observations: string;
  recordedAt: string;
  author: { type: "physician" } | { type: "resident"; residentId: string };
  customFieldValues?: CustomFieldValueBody[];
}

interface ModifyControlBody {
  observations?: string;
  recordedAt?: string;
}

/**
 * Structural (shape/type) validation only, per docs/architecture/ROADMAP.md
 * Milestone 7 — rejects malformed payloads before Application ever sees
 * them. Business invariants (non-empty names, valid dates as domain
 * concepts, etc.) remain owned by Domain (`Person.create`, `Surgery`,
 * `Control`, ...) and are not duplicated here.
 */
const registerPatientBodySchema = {
  type: "object",
  required: ["firstName", "lastName", "phone", "email", "dateOfBirth"],
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    phone: { type: "string" },
    email: { type: "string" },
    dateOfBirth: { type: "string" },
    metadata: { type: "object" },
    observations: { type: "string" },
  },
} as const;

const registerProcedureTypeBodySchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    technique: { type: "string" },
  },
} as const;

const modifyProcedureTypeBodySchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    technique: { type: "string" },
  },
} as const;

const customFieldConstraintSchema = {
  type: "object",
  oneOf: [
    {
      type: "object",
      required: ["valueType"],
      properties: {
        valueType: { const: "NUMBER" },
        unit: { type: "string" },
        min: { type: "number" },
        max: { type: "number" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["valueType", "options"],
      properties: {
        valueType: { const: "ENUM" },
        options: { type: "array", items: { type: "string" }, minItems: 1 },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["valueType"],
      properties: { valueType: { const: "TEXT" }, maxLength: { type: "integer" } },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["valueType"],
      properties: {
        valueType: { const: "DATE" },
        min: { type: "string" },
        max: { type: "string" },
      },
      additionalProperties: false,
    },
  ],
} as const;

const addCustomFieldBodySchema = {
  type: "object",
  required: ["name", "scope", "constraint"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    scope: { enum: ["SURGERY", "CONTROL"] },
    constraint: customFieldConstraintSchema,
  },
} as const;

const customFieldValueSchema = {
  type: "object",
  required: ["definitionId", "value"],
  properties: {
    definitionId: { type: "string" },
    // Order matters under Fastify/AJV's coerceTypes: it tries each anyOf
    // branch in order and keeps the first that validates after coercion,
    // so "number" must come first — otherwise a real numeric value like
    // 3 would be coerced to the string "3" to satisfy the string branch.
    value: { anyOf: [{ type: "number" }, { type: "string" }] },
  },
} as const;

const registerSurgeryBodySchema = {
  type: "object",
  required: ["patientId", "procedureTypeId", "performedAt"],
  properties: {
    patientId: { type: "string" },
    procedureTypeId: { type: "string" },
    performedAt: { type: "string" },
    customFieldValues: { type: "array", items: customFieldValueSchema },
  },
} as const;

const controlAuthorSchema = {
  type: "object",
  oneOf: [
    {
      type: "object",
      required: ["type"],
      properties: { type: { const: "physician" } },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["type", "residentId"],
      properties: { type: { const: "resident" }, residentId: { type: "string" } },
      additionalProperties: false,
    },
  ],
} as const;

const recordControlBodySchema = {
  type: "object",
  required: ["observations", "recordedAt", "author"],
  properties: {
    observations: { type: "string" },
    recordedAt: { type: "string" },
    author: controlAuthorSchema,
    customFieldValues: { type: "array", items: customFieldValueSchema },
  },
} as const;

const modifyControlBodySchema = {
  type: "object",
  properties: {
    observations: { type: "string" },
    recordedAt: { type: "string" },
  },
} as const;

const surgeryIdParamsSchema = {
  type: "object",
  required: ["surgeryId"],
  properties: { surgeryId: { type: "string" } },
} as const;

const controlParamsSchema = {
  type: "object",
  required: ["surgeryId", "controlId"],
  properties: { surgeryId: { type: "string" }, controlId: { type: "string" } },
} as const;

const procedureTypeIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string" } },
} as const;

/**
 * Patient/ProcedureType/Surgery are Domain entities whose fields live
 * behind getters, not own enumerable properties — `reply.send()` would
 * serialize them as `{}`. These are the one translation HTTP is
 * responsible for: plain, JSON-shaped views of what Domain already
 * exposes, with no business logic of their own.
 */
function serializePatient(patient: Patient) {
  return {
    id: patient.id,
    physicianId: patient.physicianId,
    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,
    email: patient.email,
    dateOfBirth: patient.dateOfBirth,
    metadata: patient.metadata,
    observations: patient.observations,
  };
}

function serializeProcedureType(procedureType: ProcedureType) {
  return {
    id: procedureType.id,
    physicianId: procedureType.physicianId,
    name: procedureType.name,
    description: procedureType.description,
    technique: procedureType.technique,
    customFields: procedureType.customFields.map((field) => ({
      id: field.id,
      name: field.name,
      description: field.description,
      scope: field.scope,
      constraint: field.constraint,
    })),
  };
}

export function serializeSurgery(surgery: Surgery) {
  return {
    id: surgery.id,
    physicianId: surgery.physicianId,
    patientId: surgery.patientId,
    procedureTypeId: surgery.procedureTypeId,
    performedAt: surgery.performedAt,
    state: surgery.state,
    participatingResidentIds: surgery.participatingResidentIds,
    customFieldValues: surgery.customFieldValues.map((value) => ({
      definitionId: value.definitionId,
      value: value.value,
    })),
    controls: surgery.controls.map((control) => ({
      id: control.id,
      observations: control.observations,
      recordedAt: control.recordedAt,
      author: control.author,
      customFieldValues: control.customFieldValues.map((value) => ({
        definitionId: value.definitionId,
        value: value.value,
      })),
    })),
  };
}

/**
 * The Milestone 1 operations, reached over HTTP. Every handler here does
 * exactly one thing beyond translation: take `request.physicianId` — set
 * only by `requireAuth` from the authenticated session — as the tenant
 * for the underlying Application operation. No route ever reads a
 * physicianId from the request body/params/query.
 *
 * Every route below is Physician-only (`requirePhysicianAuth`) EXCEPT
 * the two Control routes, which ADR 0017 deliberately opens to both
 * kinds of principal — see `controlAuth` and its handlers below for how
 * they branch on `request.userType`.
 */
export function registerCoreLoopRoutes(app: FastifyInstance, deps: AppDeps): void {
  const auth = { preHandler: requirePhysicianAuth(deps.sessionRepository) };
  const controlAuth = { preHandler: requireAuth(deps.sessionRepository) };

  app.post<{ Body: RegisterPatientBody }>(
    "/patients",
    { ...auth, schema: { body: registerPatientBodySchema } },
    async (request, reply) => {
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
    },
  );

  app.post<{ Body: RegisterProcedureTypeBody }>(
    "/procedure-types",
    { ...auth, schema: { body: registerProcedureTypeBodySchema } },
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

  app.patch<{ Params: { id: string }; Body: ModifyProcedureTypeBody }>(
    "/procedure-types/:id",
    {
      ...auth,
      schema: { params: procedureTypeIdParamsSchema, body: modifyProcedureTypeBodySchema },
    },
    async (request, reply) => {
      try {
        const output = await modifyProcedureType(deps)({
          physicianId: request.physicianId as string,
          procedureTypeId: request.params.id,
          name: request.body.name,
          description: request.body.description,
          technique: request.body.technique,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Params: { id: string }; Body: AddCustomFieldBody }>(
    "/procedure-types/:id/custom-fields",
    { ...auth, schema: { params: procedureTypeIdParamsSchema, body: addCustomFieldBodySchema } },
    async (request, reply) => {
      try {
        const output = await addCustomField(deps)({
          physicianId: request.physicianId as string,
          procedureTypeId: request.params.id,
          id: randomUUID(),
          name: request.body.name,
          description: request.body.description,
          scope: request.body.scope,
          // DATE min/max would need string->Date conversion here; not
          // wired yet since no real usage of a DATE-valueType CustomField
          // exists (ADR 0018's two concrete cases are ENUM and NUMBER).
          constraint: request.body.constraint as never,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Body: RegisterSurgeryBody }>(
    "/surgeries",
    { ...auth, schema: { body: registerSurgeryBodySchema } },
    async (request, reply) => {
      try {
        const output = await registerSurgery(deps)({
          physicianId: request.physicianId as string,
          id: randomUUID(),
          patientId: request.body.patientId,
          procedureTypeId: request.body.procedureTypeId,
          performedAt: new Date(request.body.performedAt),
          customFieldValues: request.body.customFieldValues,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.post<{ Params: { surgeryId: string }; Body: RecordControlBody }>(
    "/surgeries/:surgeryId/controls",
    {
      ...controlAuth,
      schema: { params: surgeryIdParamsSchema, body: recordControlBodySchema },
    },
    async (request, reply) => {
      try {
        // A Resident session never gets to choose the author it acts
        // as — always forced to themselves, ignoring whatever the
        // client sent, same trust posture as physicianId never coming
        // from the body (ADR 0017). A Physician session keeps its
        // existing freedom to record on behalf of either themselves or
        // a participating Resident.
        if (request.userType === "resident") {
          await requireResidentPasswordChanged(deps.residentCredentialRepository)(request, reply);
          if (reply.sent) {
            return reply;
          }
        }
        const author =
          request.userType === "resident"
            ? ({ type: "resident", residentId: request.residentId as string } as const)
            : request.body.author;

        const output = await recordControl(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.surgeryId,
          id: randomUUID(),
          observations: request.body.observations,
          recordedAt: new Date(request.body.recordedAt),
          author,
          customFieldValues: request.body.customFieldValues,
        });
        return await reply.code(201).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.patch<{ Params: { surgeryId: string; controlId: string }; Body: ModifyControlBody }>(
    "/surgeries/:surgeryId/controls/:controlId",
    {
      ...controlAuth,
      schema: { params: controlParamsSchema, body: modifyControlBodySchema },
    },
    async (request, reply) => {
      try {
        if (request.userType === "resident") {
          await requireResidentPasswordChanged(deps.residentCredentialRepository)(request, reply);
          if (reply.sent) {
            return reply;
          }
        }
        const actor =
          request.userType === "resident"
            ? ({ type: "resident", residentId: request.residentId as string } as const)
            : ({ type: "physician" } as const);

        const output = await modifyControl(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.surgeryId,
          controlId: request.params.controlId,
          changes: {
            observations: request.body.observations,
            recordedAt: request.body.recordedAt ? new Date(request.body.recordedAt) : undefined,
          },
          actor,
        });
        return await reply.code(200).send(output);
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );

  app.get("/patients", auth, async (request, reply) => {
    try {
      const patients = await listPatients(deps)({ physicianId: request.physicianId as string });
      return await reply.code(200).send(patients.map(serializePatient));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>("/patients/:id", auth, async (request, reply) => {
    try {
      const patient = await getPatient(deps)({
        physicianId: request.physicianId as string,
        patientId: request.params.id,
      });
      return await reply.code(200).send(serializePatient(patient));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get("/procedure-types", auth, async (request, reply) => {
    try {
      const procedureTypes = await listProcedureTypes(deps)({
        physicianId: request.physicianId as string,
      });
      return await reply.code(200).send(procedureTypes.map(serializeProcedureType));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>("/procedure-types/:id", auth, async (request, reply) => {
    try {
      const procedureType = await getProcedureType(deps)({
        physicianId: request.physicianId as string,
        procedureTypeId: request.params.id,
      });
      return await reply.code(200).send(serializeProcedureType(procedureType));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get("/surgeries", auth, async (request, reply) => {
    try {
      const surgeries = await listSurgeries(deps)({ physicianId: request.physicianId as string });
      return await reply.code(200).send(surgeries.map(serializeSurgery));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { surgeryId: string } }>(
    "/surgeries/:surgeryId",
    auth,
    async (request, reply) => {
      try {
        const surgery = await getSurgery(deps)({
          physicianId: request.physicianId as string,
          surgeryId: request.params.surgeryId,
        });
        return await reply.code(200).send(serializeSurgery(surgery));
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );
}

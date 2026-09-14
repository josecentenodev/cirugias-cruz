import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  acceptResidentInvitation,
  assignResidentToSurgery,
  changeResidentPassword,
  getResident,
  getSurgeryForResident,
  listResidents,
  listSurgeriesForResident,
  NotFoundError,
  registerResident,
  removeResidentFromSurgery,
  resendResidentInvitation,
  sendResidentInvitation,
  setResidentActive,
} from "@cirugias-cruz/application";
import type { AppDeps } from "../deps.js";
import { replyForError } from "../shared/errors.js";
import { requirePhysicianAuth } from "../shared/require-physician-auth.js";
import { requireResidentAuth } from "../shared/require-resident-auth.js";
import { serializeControlDefinition, serializeCustomField, serializeSurgery } from "./core-loop.js";

/**
 * `/me/surgeries*` only — adds `patientName`/`procedureTypeName` to the
 * shared `serializeSurgery` shape. Kept local to this file rather than
 * widening `serializeSurgery` itself, which the Physician-facing routes
 * in `core-loop.ts` also use and already resolve names client-side.
 */
function serializeSurgeryForResident(entry: {
  surgery: Parameters<typeof serializeSurgery>[0];
  patientName: string;
  procedureTypeName: string;
  procedureTypeCustomFields?: readonly Parameters<typeof serializeCustomField>[0][];
  procedureTypeControlDefinitions?: readonly Parameters<typeof serializeControlDefinition>[0][];
  followUp?: Parameters<typeof serializeSurgery>[1];
}) {
  return {
    ...serializeSurgery(entry.surgery, entry.followUp ?? []),
    patientName: entry.patientName,
    procedureTypeName: entry.procedureTypeName,
    // Present on the single-Surgery read (so the Resident's record-Control
    // form can render CONTROL-scoped inputs); the list read omits it.
    customFields: (entry.procedureTypeCustomFields ?? []).map(serializeCustomField),
    controlDefinitions: (entry.procedureTypeControlDefinitions ?? []).map(
      serializeControlDefinition,
    ),
  };
}

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

interface AcceptInvitationBody {
  token: string;
  password: string;
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

const acceptInvitationBodySchema = {
  type: "object",
  required: ["token", "password"],
  properties: { token: { type: "string" }, password: { type: "string" } },
} as const;

// Same posture as the auth routes (routes/auth.ts) — a brute-
// force/abuse target for the same reason.
const invitationRateLimit = { max: 5, timeWindow: "1 minute" };

function toResidentDto(entry: {
  resident: {
    id: string;
    physicianId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: Date;
    metadata?: Record<string, unknown>;
  };
  active: boolean;
  invitationAccepted: boolean;
  invitedAt: Date | null;
  acceptedAt: Date | null;
}) {
  const { resident, active, invitationAccepted, invitedAt, acceptedAt } = entry;
  return {
    id: resident.id,
    physicianId: resident.physicianId,
    firstName: resident.firstName,
    lastName: resident.lastName,
    phone: resident.phone,
    email: resident.email,
    dateOfBirth: resident.dateOfBirth.toISOString(),
    metadata: resident.metadata,
    active,
    invitationAccepted,
    invitedAt: invitedAt?.toISOString() ?? null,
    acceptedAt: acceptedAt?.toISOString() ?? null,
  };
}

/**
 * Resident vertical slice, reached over HTTP — Milestone 5's original
 * physician-management routes, ADR 0017's login/self-service for the
 * Resident as a principal in their own right, and ADR 0029's
 * invitation-by-email onboarding (replacing 0017's visible-temporary-
 * password mechanism).
 *
 * Three auth postures live in this one file:
 * - `physicianAuth` — the Physician managing their Residents (create,
 *   list, get, assign/remove from a Surgery, resend an invitation,
 *   activate/deactivate). Unchanged in spirit from Milestone 5.
 * - unauthenticated — accepting an invitation (there is no session yet
 *   to attach until a password exists), same posture as
 *   `/physicians`/`/email-confirmations`.
 * - `residentAuth` (`/me/...`) — a Resident acting as themselves: their
 *   own Surgery panel (read-only; Control create/edit lives in
 *   routes/core-loop.ts, shared with the Physician) and changing their
 *   own password.
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
        // ADR 0029: registration alone creates no usable credential —
        // the emailed invitation is what makes login possible at all,
        // same non-blocking-on-send-failure posture as
        // `sendConfirmationEmail` after `registerPhysician` (0015).
        try {
          await sendResidentInvitation(deps)({
            residentId: output.residentId,
            email: request.body.email,
            firstName: request.body.firstName,
            webBaseUrl: deps.webBaseUrl,
          });
        } catch (error) {
          request.log.error(
            { err: error, residentId: output.residentId },
            "Failed to send resident invitation email",
          );
        }
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

  app.post<{ Params: { id: string } }>(
    "/residents/:id/resend-invitation",
    {
      ...physicianAuth,
      schema: { params: residentIdParamsSchema },
      config: { rateLimit: invitationRateLimit },
    },
    async (request, reply) => {
      try {
        await resendResidentInvitation(deps)({
          physicianId: request.physicianId as string,
          residentId: request.params.id,
          webBaseUrl: deps.webBaseUrl,
        }).catch((error) => {
          // The credential state is already cleared by this point
          // regardless of whether the email itself sends — a Resend
          // outage/misconfiguration is logged, never a 500, same
          // resilience posture as the invitation sent on registration.
          if (error instanceof NotFoundError) {
            throw error;
          }
          request.log.error(
            { err: error, residentId: request.params.id },
            "Failed to resend resident invitation email",
          );
        });
        return await reply.code(204).send();
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

  // --- Accepting an invitation (ADR 0029) — unauthenticated by
  // definition, same reasoning as /physicians and /email-confirmations:
  // there is no session yet to attach until the Resident sets a password.
  app.post<{ Body: AcceptInvitationBody }>(
    "/resident-invitations/accept",
    {
      schema: { body: acceptInvitationBodySchema },
      config: { rateLimit: invitationRateLimit },
    },
    async (request, reply) => {
      try {
        const output = await acceptResidentInvitation(deps)({
          token: request.body.token,
          password: request.body.password,
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
  // allowed).
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
      const surgeries = await listSurgeriesForResident(deps)({
        residentId: request.residentId as string,
      });
      return await reply.code(200).send(surgeries.map(serializeSurgeryForResident));
    } catch (error) {
      return replyForError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>(
    "/me/surgeries/:id",
    { ...residentAuth, schema: { params: surgeryIdParamsSchema } },
    async (request, reply) => {
      try {
        const surgery = await getSurgeryForResident(deps)({
          residentId: request.residentId as string,
          surgeryId: request.params.id,
        });
        return await reply.code(200).send(serializeSurgeryForResident(surgery));
      } catch (error) {
        return replyForError(error, reply);
      }
    },
  );
}

import { z } from "zod";

/**
 * Structural validation only, mirroring `api`'s own
 * `registerSurgeryBodySchema` — `patientId`/`procedureTypeId`/
 * `performedAt` are all required, matching `Surgery.create` in Domain.
 * Which patient/procedure type ids are *valid* (exist, belong to this
 * tenant) is `api`'s call — this schema only rejects an empty selection.
 */
export const registerSurgerySchema = z.object({
  patientId: z.string().trim().min(1, "Select a patient"),
  procedureTypeId: z.string().trim().min(1, "Select a procedure type"),
  performedAt: z.string().trim().min(1, "Performed date is required"),
});

export type RegisterSurgeryInput = z.infer<typeof registerSurgerySchema>;

/**
 * Mirrors `api`'s own `recordControlBodySchema` / `controlAuthorSchema`
 * (`packages/http/src/routes/core-loop.ts`) — the `oneOf` discriminated
 * union there becomes a `discriminatedUnion` here, same structural rule:
 * a resident-authored control must name which resident. *Which*
 * `residentId` is a currently-participating one is `api`'s own
 * business-rule check (`Surgery.recordControl`), not duplicated here.
 */
export const recordControlSchema = z.discriminatedUnion("authorType", [
  z.object({
    authorType: z.literal("physician"),
    observations: z.string().trim().min(1, "Observations are required"),
    recordedAt: z.string().trim().min(1, "Recorded date is required"),
  }),
  z.object({
    authorType: z.literal("resident"),
    residentId: z.string().trim().min(1, "Select which resident recorded this"),
    observations: z.string().trim().min(1, "Observations are required"),
    recordedAt: z.string().trim().min(1, "Recorded date is required"),
  }),
]);

export type RecordControlInput = z.infer<typeof recordControlSchema>;

/**
 * Mirrors `api`'s own `modifyControlBodySchema` — every field optional
 * (a partial update), matching `Surgery.modifyControl`'s own signature.
 */
export const modifyControlSchema = z.object({
  observations: z.string().trim().optional(),
  recordedAt: z.string().trim().optional(),
});

export type ModifyControlInput = z.infer<typeof modifyControlSchema>;

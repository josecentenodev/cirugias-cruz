import { z } from "zod";

/**
 * Structural validation only, mirroring `api`'s own
 * `registerProcedureTypeBodySchema` (`packages/http/src/routes/core-loop.ts`)
 * field-for-field — only `name` is required, matching
 * `ProcedureType.create` in Domain exactly. `description`/`technique`
 * stay free text, per Domain's own comment: the technique set is
 * deliberately not a closed enum. See
 * docs/architecture/milestone-8-design.md §10.
 */
export const registerProcedureTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  technique: z.string().trim().optional(),
});

export type RegisterProcedureTypeInput = z.infer<typeof registerProcedureTypeSchema>;

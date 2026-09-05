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

/**
 * Mirrors `api`'s own `modifyProcedureTypeBodySchema` — every field
 * optional (a partial update), matching `ProcedureType.modify`'s own
 * signature. Same style as `features/surgeries/schemas.ts`'s
 * `modifyControlSchema`.
 */
export const modifyProcedureTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  description: z.string().trim().optional(),
  technique: z.string().trim().optional(),
});

export type ModifyProcedureTypeInput = z.infer<typeof modifyProcedureTypeSchema>;

/**
 * Mirrors `api`'s own `addCustomFieldBodySchema`/`customFieldConstraintSchema`
 * (`packages/http/src/routes/core-loop.ts`) — the `oneOf` discriminated
 * union there becomes a `discriminatedUnion` here, same structural rule
 * `recordControlSchema` in `features/surgeries/schemas.ts` already
 * follows for `api`'s `controlAuthorSchema`. DATE is intentionally not a
 * branch here — no real DATE-scoped CustomField exists yet (see
 * `core-loop.ts`'s own `as never` for the same reason); adding it without
 * a driving case would be speculative.
 *
 * ENUM options arrive from a single textarea as newline-separated text,
 * split/trimmed/filtered here rather than via a dynamic add/remove-row
 * widget — kept simple on purpose; see docs/architecture/ROADMAP.md's
 * Milestone 8.6 entry for the same "don't build speculative UI" instinct
 * applied to the backend.
 */
export const addCustomFieldSchema = z.discriminatedUnion("valueType", [
  z.object({
    valueType: z.literal("NUMBER"),
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional(),
    scope: z.enum(["SURGERY", "CONTROL"]),
    unit: z.string().trim().optional(),
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
  }),
  z.object({
    valueType: z.literal("ENUM"),
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional(),
    scope: z.enum(["SURGERY", "CONTROL"]),
    options: z
      .string()
      .transform((value) =>
        value
          .split("\n")
          .map((option) => option.trim())
          .filter((option) => option.length > 0),
      )
      .refine((options) => options.length > 0, "At least one option is required"),
  }),
  z.object({
    valueType: z.literal("TEXT"),
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().optional(),
    scope: z.enum(["SURGERY", "CONTROL"]),
    maxLength: z.coerce.number().optional(),
  }),
]);

export type AddCustomFieldInput = z.infer<typeof addCustomFieldSchema>;

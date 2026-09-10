import { z } from "zod";

/**
 * Structural validation only, mirroring `api`'s own
 * `registerProcedureTypeBodySchema` (`packages/http/src/routes/core-loop.ts`)
 * field-for-field — `name` + optional `description`, matching
 * `ProcedureType.create` in Domain exactly. Surgical technique is a
 * `SURGERY`-scoped ENUM CustomField, not a ProcedureType field (ADR 0022).
 */
export const registerProcedureTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
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

/**
 * Mirrors `api`'s own `controlOccurrenceRuleSchema` / control-definition
 * body schemas (ADR 0026). The form submits a flat `mode` + optional
 * `count`/`every`/`unit`; this reassembles the discriminated union `api`
 * expects. `api` (`ControlDefinition.create`) stays the sole authority on
 * name-uniqueness and the freeze rule (ADR 0027).
 */
export const controlDefinitionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    mode: z.enum(["uncapped", "capped"]),
    count: z.coerce.number().int().min(1).optional(),
    every: z.coerce.number().int().min(1).optional(),
    unit: z.enum(["hours", "days", "weeks"]).optional(),
  })
  .refine(
    (value) =>
      value.mode === "uncapped" ||
      (value.count !== undefined && value.every !== undefined && value.unit !== undefined),
    "A capped control needs a count and a measurement period",
  );

export type ControlDefinitionInput = z.infer<typeof controlDefinitionSchema>;

export function toOccurrenceRuleBody(input: ControlDefinitionInput) {
  return input.mode === "uncapped"
    ? { mode: "uncapped" as const }
    : {
        mode: "capped" as const,
        count: input.count as number,
        period: { every: input.every as number, unit: input.unit as "hours" | "days" | "weeks" },
      };
}

import { z } from "zod";

/**
 * Structural validation only, mirroring `api`'s own
 * `researchStudyTextFieldsBodySchema` (`packages/http/src/routes/research-study.ts`)
 * field-for-field — every field is a plain string with no non-empty rule,
 * since Domain (`ResearchStudy`) has none for hypothesis/results/analysis/
 * conclusion. There is nothing to reject client-side beyond "this is a
 * string" — the same permissiveness `api` itself grants.
 */
export const researchStudyTextFieldsSchema = z.object({
  hypothesis: z.string(),
  results: z.string(),
  analysis: z.string(),
  conclusion: z.string(),
});

export type ResearchStudyTextFieldsInput = z.infer<typeof researchStudyTextFieldsSchema>;

/** Mirrors `api`'s own `addSurgeryBodySchema` — a non-empty selection is the only structural requirement. */
export const addSurgeryToStudySchema = z.object({
  surgeryId: z.string().trim().min(1, "Please select a surgery."),
});

import { z } from "zod";

/**
 * Structural validation only, mirroring `api`'s own
 * `registerPatientBodySchema` (`packages/http/src/routes/core-loop.ts`)
 * field-for-field — required non-empty strings, nothing stricter than
 * what Domain (`Person.create`) already enforces. `metadata` is
 * deliberately omitted from this form: it's an arbitrary JSON blob with
 * no defined UI representation and no MVP requirement to expose one —
 * not invented here. See docs/architecture/milestone-8-design.md §10/§12.
 */
export const registerPatientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().min(1, "Email is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
  observations: z.string().trim().optional(),
});

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;

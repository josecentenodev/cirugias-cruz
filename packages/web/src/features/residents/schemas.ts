import { z } from "zod";

/**
 * Structural validation only, mirroring `api`'s own
 * `registerResidentBodySchema` (`packages/http/src/routes/resident.ts`)
 * field-for-field — the same required fields as Patient's registration
 * (`Resident` shares `Person`'s shape in Domain). `metadata` is omitted
 * from this form for the same reason it's omitted from Patient's: an
 * arbitrary JSON blob with no defined UI representation.
 */
export const registerResidentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().min(1, "Email is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
});

export type RegisterResidentInput = z.infer<typeof registerResidentSchema>;

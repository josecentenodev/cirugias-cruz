import { z } from "zod";

/**
 * Structural (shape/type) validation only, mirroring `api`'s own
 * `loginBodySchema` (`packages/http/src/routes/auth.ts`) — non-empty
 * required strings, nothing more. Business rules (does this credential
 * match a real account) stay entirely `api`'s call; this never guesses
 * at password strength or email format rules Domain doesn't itself
 * enforce. See docs/architecture/milestone-8-design.md §10.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Mirrors `api`'s own `registerPhysicianBodySchema`
 * (`packages/http/src/routes/auth.ts`) field-for-field — required
 * non-empty strings, nothing stricter. No invented password-strength
 * rule: `registerPhysician` (Domain/Application) has none, so this
 * doesn't either — same reasoning `loginSchema`'s own comment already
 * states. `metadata` omitted, same as `registerPatientSchema` — no
 * defined UI representation, not part of this form.
 */
export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().min(1, "Email is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

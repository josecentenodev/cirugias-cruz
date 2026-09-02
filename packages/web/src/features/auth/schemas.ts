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

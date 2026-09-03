import { z } from "zod";

/** Mirrors `api`'s own `changePasswordBodySchema` (`PATCH /me/password`) — non-empty is the only rule, same as every other password field in this product (no invented strength rule). */
export const changePasswordSchema = z.object({
  newPassword: z.string().min(1, "Password is required"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * A Resident never chooses `author` — the server always forces it to
 * themselves (ADR 0017) — so, unlike `features/surgeries/schemas.ts`'s
 * `recordControlSchema`, there is no `authorType` field here at all.
 */
export const recordOwnControlSchema = z.object({
  observations: z.string().trim().min(1, "Observations are required"),
  recordedAt: z.string().trim().min(1, "Recorded date is required"),
});

export type RecordOwnControlInput = z.infer<typeof recordOwnControlSchema>;

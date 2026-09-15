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
  // Optional since Milestone 11 (A4/F-08).
  observations: z.string().trim().optional(),
  recordedAt: z.string().trim().min(1, "Recorded date is required"),
  // Required (ADR 0030: no ad-hoc controls).
  definitionId: z.string().trim().min(1, "Select a control type"),
});

export type RecordOwnControlInput = z.infer<typeof recordOwnControlSchema>;

/**
 * Mirrors `api`'s own `modifyControlBodySchema` — every field optional
 * (a partial update), same as `features/surgeries/schemas.ts`'s
 * `modifyControlSchema`. A Resident can never retype a Control at
 * modify time either way (ADR 0026: typed at record time only), so this
 * deliberately has no `definitionId` at all — unlike
 * `recordOwnControlSchema` above, which is a different action.
 */
export const modifyOwnControlSchema = z.object({
  observations: z.string().trim().optional(),
  recordedAt: z.string().trim().optional(),
});

export type ModifyOwnControlInput = z.infer<typeof modifyOwnControlSchema>;

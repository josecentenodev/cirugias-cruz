"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError, ApiNotFoundError } from "@/lib/api-errors";
import type { RecordControlResponse } from "@/features/surgeries/dtos";
import { changePasswordSchema, recordOwnControlSchema } from "./schemas";

export interface ChangePasswordFormState {
  error?: string;
}

/**
 * `PATCH /me/password` — the Resident changing their own password
 * (ADR 0017). Redirects to their Surgery panel on success: whether this
 * was the mandatory first-login change or a later voluntary one, there
 * is nowhere else for the Resident to go from here.
 */
export async function changeOwnPasswordAction(
  _previousState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const parsed = changePasswordSchema.safeParse({ newPassword: formData.get("newPassword") });
  if (!parsed.success) {
    return { error: "Please enter a new password." };
  }

  try {
    await authedApiRequest({ method: "PATCH", path: "/me/password", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/resident/surgeries");
}

export interface RecordOwnControlFormState {
  error?: string;
}

/**
 * `POST /surgeries/:id/controls` — the same shared route
 * `recordControlAction` (`features/surgeries/actions.ts`) uses, since
 * it's the same `api` route for both principals (ADR 0017). This is a
 * separate action, not a reuse of that one, only because it redirects
 * to the Resident's own surgery page (`/resident/surgeries/:id`) rather
 * than the Physician's (`/surgeries/:id`), and never sends an `author`
 * field at all — the server always forces it to the caller's own
 * identity for a Resident session, so there is nothing for this form to
 * choose.
 */
export async function recordOwnControlAction(
  surgeryId: string,
  _previousState: RecordOwnControlFormState,
  formData: FormData,
): Promise<RecordOwnControlFormState> {
  const parsed = recordOwnControlSchema.safeParse({
    observations: formData.get("observations"),
    recordedAt: formData.get("recordedAt"),
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    await authedApiRequest<RecordControlResponse>({
      method: "POST",
      path: `/surgeries/${surgeryId}/controls`,
      // `author` is required by api's schema but ignored server-side for
      // a Resident session (forced to themselves) — sending the
      // "resident" shape here is honest about who's asking, even though
      // the residentId named is never trusted.
      body: { ...parsed.data, author: { type: "resident", residentId: "self" } },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/resident/surgeries/${surgeryId}`);
}

export interface ModifyOwnControlFormState {
  error?: string;
}

/**
 * `PATCH /surgeries/:id/controls/:controlId` — same shared route
 * `modifyControlAction` uses; separate only for the redirect target.
 * `api` itself enforces "only your own control" (`Surgery.modifyControl`,
 * ADR 0017) — attempting another Resident's (or the Physician's) control
 * surfaces as an `ApiDomainError` here, shown inline unchanged.
 */
export async function modifyOwnControlAction(
  surgeryId: string,
  controlId: string,
  _previousState: ModifyOwnControlFormState,
  formData: FormData,
): Promise<ModifyOwnControlFormState> {
  const parsed = recordOwnControlSchema.safeParse({
    observations: formData.get("observations"),
    recordedAt: formData.get("recordedAt"),
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    await authedApiRequest({
      method: "PATCH",
      path: `/surgeries/${surgeryId}/controls/${controlId}`,
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/resident/surgeries/${surgeryId}`);
}

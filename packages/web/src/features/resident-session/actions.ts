"use server";

import type { ActionResult } from "@/lib/action-result";
import { authedApiRequest } from "@/lib/authed-api-request";
import { runFormAction } from "@/lib/form-action";
import {
  collectCustomFieldValues,
  hasCustomFieldInputs,
  type CollectedCustomFieldValue,
} from "@/features/procedure-types/custom-field-values";
import type { RecordControlResponse } from "@/features/surgeries/dtos";
import { messages } from "@/messages/en";
import { getOwnSurgery } from "./queries";
import { changePasswordSchema, modifyOwnControlSchema, recordOwnControlSchema } from "./schemas";

/**
 * The Resident's own actions (ADR 0017). Every one goes through
 * `runFormAction` (docs/architecture/milestone-12-form-feedback-design.md)
 * — feedback is centralized there.
 */

const ownSurgeryPath = (surgeryId: string) => `/resident/surgeries/${surgeryId}`;

/**
 * `PATCH /me/password`. Redirects to their Surgery panel on success:
 * whether this was the mandatory first-login change or a later voluntary
 * one, there is nowhere else for the Resident to go from here.
 */
export async function changeOwnPasswordAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: changePasswordSchema,
    input: (fd) => ({ newPassword: fd.get("newPassword") }),
    invalidMessage: messages.errors.newPasswordRequired,
    run: (body) => authedApiRequest({ method: "PATCH", path: "/me/password", body }),
    success: { message: "passwordChanged", redirectTo: "/resident/surgeries" },
  });
}

/**
 * `POST /surgeries/:id/controls` — the same shared route
 * `recordControlAction` (`features/surgeries/actions.ts`) uses (ADR
 * 0017). A separate action only because it redirects to the Resident's
 * own surgery page and never chooses an `author`: the server forces it
 * to the caller's own identity for a Resident session.
 */
export async function recordOwnControlAction(
  surgeryId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: recordOwnControlSchema,
    input: (fd) => ({
      observations: fd.get("observations") || undefined,
      recordedAt: fd.get("recordedAt"),
      definitionId: fd.get("definitionId"),
    }),
    run: async (data) => {
      // Same shape as the Physician's `recordControlAction`: re-read the
      // definitions server-side and coerce by `valueType`; `api` re-validates.
      let customFieldValues: CollectedCustomFieldValue[] = [];
      if (hasCustomFieldInputs(formData)) {
        const surgery = await getOwnSurgery(surgeryId);
        customFieldValues = collectCustomFieldValues(
          formData,
          surgery.customFields.filter((field) => field.scope === "CONTROL"),
        );
      }
      await authedApiRequest<RecordControlResponse>({
        method: "POST",
        path: `/surgeries/${surgeryId}/controls`,
        // `author` is required by api's schema but ignored server-side for
        // a Resident session (forced to themselves) — sending the
        // "resident" shape here is honest about who's asking, even though
        // the residentId named is never trusted.
        body: {
          recordedAt: data.recordedAt,
          ...(data.observations ? { observations: data.observations } : {}),
          definitionId: data.definitionId,
          author: { type: "resident", residentId: "self" },
          ...(customFieldValues.length > 0 ? { customFieldValues } : {}),
        },
      });
    },
    success: { message: "controlRecorded", redirectTo: ownSurgeryPath(surgeryId) },
  });
}

/**
 * `PATCH /surgeries/:id/controls/:controlId` — same shared route
 * `modifyControlAction` uses; separate only for the redirect target.
 * `api` itself enforces "only your own control" (`Surgery.modifyControl`,
 * ADR 0017) — shown inline unchanged.
 */
export async function modifyOwnControlAction(
  surgeryId: string,
  controlId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: modifyOwnControlSchema,
    input: (fd) => ({
      observations: fd.get("observations"),
      recordedAt: fd.get("recordedAt"),
    }),
    run: (body) =>
      authedApiRequest({
        method: "PATCH",
        path: `/surgeries/${surgeryId}/controls/${controlId}`,
        body,
      }),
    success: { message: "controlUpdated", redirectTo: ownSurgeryPath(surgeryId) },
  });
}

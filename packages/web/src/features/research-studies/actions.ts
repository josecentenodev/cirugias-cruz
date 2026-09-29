"use server";

import type { ActionResult } from "@/lib/action-result";
import { authedApiRequest } from "@/lib/authed-api-request";
import { runFormAction } from "@/lib/form-action";
import { messages } from "@/messages/en";
import type {
  CreateResearchStudyResponse,
  ResearchStudyStatus,
  StatusChangeResponse,
  SurgeryMutationResponse,
} from "./dtos";
import { addSurgeryToStudySchema, researchStudyTextFieldsSchema } from "./schemas";

/**
 * Every action here goes through `runFormAction`
 * (docs/architecture/milestone-12-form-feedback-design.md) — feedback is
 * centralized there. `api`'s own `ResearchStudy` stays the sole authority
 * on the lifecycle (`assertModifiable`, `assertCanBeDeletedBy`, legal
 * status transitions); its rejections are shown inline verbatim.
 */

const detailPath = (researchStudyId: string) => `/research-studies/${researchStudyId}`;

function textFieldsInput(fd: FormData) {
  return {
    hypothesis: fd.get("hypothesis") ?? "",
    results: fd.get("results") ?? "",
    analysis: fd.get("analysis") ?? "",
    conclusion: fd.get("conclusion") ?? "",
  };
}

/** `POST /research-studies`. Every field is optional at the Domain level — a study can start blank. */
export async function createResearchStudyAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: researchStudyTextFieldsSchema,
    input: textFieldsInput,
    run: (body) =>
      authedApiRequest<CreateResearchStudyResponse>({
        method: "POST",
        path: "/research-studies",
        body,
      }),
    success: (response) => ({
      message: "studyCreated",
      redirectTo: detailPath(response.researchStudyId),
    }),
  });
}

/**
 * `PATCH /research-studies/:id`. `api` rejects this once the study is
 * `COMPLETED` (`ResearchStudy.assertModifiable`) — this form has no
 * client-side awareness of the study's status.
 */
export async function updateResearchStudyAction(
  researchStudyId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: researchStudyTextFieldsSchema,
    input: textFieldsInput,
    run: (body) =>
      authedApiRequest({ method: "PATCH", path: `/research-studies/${researchStudyId}`, body }),
    success: { message: "studyUpdated", redirectTo: detailPath(researchStudyId) },
  });
}

/**
 * `POST /research-studies/:id/surgeries`. Lives here, not in
 * `features/surgeries/actions.ts`, mirroring `api` itself: the study
 * owns its surgery universe, a Surgery has no knowledge of which studies
 * reference it.
 */
export async function addSurgeryToStudyAction(
  researchStudyId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: addSurgeryToStudySchema,
    input: (fd) => ({ surgeryId: fd.get("surgeryId") }),
    invalidMessage: messages.errors.selectSurgery,
    run: (body) =>
      authedApiRequest<SurgeryMutationResponse>({
        method: "POST",
        path: `/research-studies/${researchStudyId}/surgeries`,
        body,
      }),
    success: { message: "studySurgeryAdded", redirectTo: detailPath(researchStudyId) },
  });
}

/** `DELETE /research-studies/:id/surgeries/:surgeryId`. */
export async function removeSurgeryFromStudyAction(
  researchStudyId: string,
  surgeryId: string,
  _previous: ActionResult,
  formData?: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: () =>
      authedApiRequest({
        method: "DELETE",
        path: `/research-studies/${researchStudyId}/surgeries/${surgeryId}`,
      }),
    success: { message: "studySurgeryRemoved", redirectTo: detailPath(researchStudyId) },
  });
}

/**
 * Bound to both `researchStudyId` and the single `to` status the calling
 * button represents (`StatusActions.tsx` renders exactly one button per
 * current status). `api`'s `POST /research-studies/:id/status` re-derives
 * `current` server-side and is the sole authority on which transition is
 * legal — this action never guesses a Domain method name.
 */
export async function changeResearchStudyStatusAction(
  researchStudyId: string,
  to: ResearchStudyStatus,
  _previous: ActionResult,
  formData?: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: () =>
      authedApiRequest<StatusChangeResponse>({
        method: "POST",
        path: `/research-studies/${researchStudyId}/status`,
        body: { to },
      }),
    success: { message: "studyStatusChanged", redirectTo: detailPath(researchStudyId) },
  });
}

/**
 * `DELETE /research-studies/:id`. `api`'s `assertCanBeDeletedBy` rejects
 * this once the study has left `DRAFT`; the delete button is only
 * rendered while `DRAFT` — a presentation convenience, not the
 * enforcement itself.
 */
export async function deleteResearchStudyAction(
  researchStudyId: string,
  _previous: ActionResult,
  formData?: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: () => authedApiRequest({ method: "DELETE", path: `/research-studies/${researchStudyId}` }),
    success: { message: "studyDeleted", redirectTo: "/research-studies" },
  });
}

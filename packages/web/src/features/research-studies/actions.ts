"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError, ApiNotFoundError } from "@/lib/api-errors";
import type {
  CreateResearchStudyResponse,
  ResearchStudyStatus,
  StatusChangeResponse,
  SurgeryMutationResponse,
} from "./dtos";
import { addSurgeryToStudySchema, researchStudyTextFieldsSchema } from "./schemas";

function readTextFields(formData: FormData) {
  return researchStudyTextFieldsSchema.parse({
    hypothesis: formData.get("hypothesis") ?? "",
    results: formData.get("results") ?? "",
    analysis: formData.get("analysis") ?? "",
    conclusion: formData.get("conclusion") ?? "",
  });
}

export interface CreateResearchStudyFormState {
  error?: string;
}

/** `POST /research-studies`, through `authedApiRequest` — 401 handling is centralized there. */
export async function createResearchStudyAction(
  _previousState: CreateResearchStudyFormState,
  formData: FormData,
): Promise<CreateResearchStudyFormState> {
  const fields = readTextFields(formData);

  let response: CreateResearchStudyResponse;
  try {
    response = await authedApiRequest<CreateResearchStudyResponse>({
      method: "POST",
      path: "/research-studies",
      body: fields,
    });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/research-studies/${response.researchStudyId}`);
}

export interface UpdateResearchStudyFormState {
  error?: string;
}

/**
 * Bound to a specific `researchStudyId` — same pattern as
 * `modifyControlAction`. `api`'s own `PATCH /research-studies/:id`
 * rejects this once the study is `COMPLETED`
 * (`ResearchStudy.assertModifiable`); that rejection surfaces here as an
 * `ApiDomainError`, shown inline unchanged — this form has no
 * client-side awareness of the study's status.
 */
export async function updateResearchStudyAction(
  researchStudyId: string,
  _previousState: UpdateResearchStudyFormState,
  formData: FormData,
): Promise<UpdateResearchStudyFormState> {
  const fields = readTextFields(formData);

  try {
    await authedApiRequest({
      method: "PATCH",
      path: `/research-studies/${researchStudyId}`,
      body: fields,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/research-studies/${researchStudyId}`);
}

export interface AddSurgeryToStudyFormState {
  error?: string;
}

/**
 * `POST /research-studies/:id/surgeries` — bound to `researchStudyId`.
 * Lives here, not in `features/surgeries/actions.ts`, mirroring `api`
 * itself: `addSurgeryToResearchStudy` is defined in
 * `packages/application/src/research-study/`, on ResearchStudy's own
 * aggregate — the study owns its surgery universe, a Surgery has no
 * knowledge of which studies reference it.
 */
export async function addSurgeryToStudyAction(
  researchStudyId: string,
  _previousState: AddSurgeryToStudyFormState,
  formData: FormData,
): Promise<AddSurgeryToStudyFormState> {
  const parsed = addSurgeryToStudySchema.safeParse({ surgeryId: formData.get("surgeryId") });
  if (!parsed.success) {
    return { error: "Please select a surgery." };
  }

  try {
    await authedApiRequest<SurgeryMutationResponse>({
      method: "POST",
      path: `/research-studies/${researchStudyId}/surgeries`,
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/research-studies/${researchStudyId}`);
}

export interface RemoveSurgeryFromStudyFormState {
  error?: string;
}

/** `DELETE /research-studies/:id/surgeries/:surgeryId` — bound to both ids, mirrors `removeResidentAction`. */
export async function removeSurgeryFromStudyAction(
  researchStudyId: string,
  surgeryId: string,
  _previousState: RemoveSurgeryFromStudyFormState,
): Promise<RemoveSurgeryFromStudyFormState> {
  try {
    await authedApiRequest({
      method: "DELETE",
      path: `/research-studies/${researchStudyId}/surgeries/${surgeryId}`,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/research-studies/${researchStudyId}`);
}

export interface ChangeResearchStudyStatusFormState {
  error?: string;
}

/**
 * Bound to both `researchStudyId` and the single `to` status the calling
 * button represents (`StatusActions.tsx` renders exactly one button per
 * current status, never a free-form choice) — `api`'s own
 * `POST /research-studies/:id/status` route is the sole authority on
 * which `{ current, to }` combination is legal (it re-derives `current`
 * server-side and maps it onto exactly one of
 * `moveToInProgress`/`complete`/`reopen`; see
 * `packages/http/src/routes/research-study.ts`), so this action never
 * guesses a Domain method name — it only asks to reach a target status.
 */
export async function changeResearchStudyStatusAction(
  researchStudyId: string,
  to: ResearchStudyStatus,
  _previousState: ChangeResearchStudyStatusFormState,
): Promise<ChangeResearchStudyStatusFormState> {
  try {
    await authedApiRequest<StatusChangeResponse>({
      method: "POST",
      path: `/research-studies/${researchStudyId}/status`,
      body: { to },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/research-studies/${researchStudyId}`);
}

export interface DeleteResearchStudyFormState {
  error?: string;
}

/**
 * `DELETE /research-studies/:id`. `api`'s own
 * `ResearchStudy.assertCanBeDeletedBy` rejects this once the study has
 * left `DRAFT` — that rejection surfaces as `state.error`; the delete
 * button is only rendered while `status === "DRAFT"`
 * (`ResearchStudyDetail.tsx`), a presentation convenience, not the
 * enforcement itself.
 */
export async function deleteResearchStudyAction(
  researchStudyId: string,
  _previousState: DeleteResearchStudyFormState,
): Promise<DeleteResearchStudyFormState> {
  try {
    await authedApiRequest({
      method: "DELETE",
      path: `/research-studies/${researchStudyId}`,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/research-studies");
}

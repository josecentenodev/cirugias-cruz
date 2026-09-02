"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError, ApiNotFoundError } from "@/lib/api-errors";
import type { RecordControlResponse, RegisterSurgeryResponse } from "./dtos";
import {
  assignResidentSchema,
  modifyControlSchema,
  recordControlSchema,
  registerSurgerySchema,
} from "./schemas";

export interface RegisterSurgeryFormState {
  error?: string;
}

/**
 * `POST /surgeries`, through `authedApiRequest` — 401 handling is
 * centralized there. `api` itself verifies the referenced patient/
 * procedure type exist and belong to this tenant
 * (`registerSurgery`'s own cross-aggregate check); a mismatch surfaces
 * as an `ApiDomainError` or `ApiNotFoundError` here, shown inline
 * unchanged — this form never pre-validates that a selected id is
 * "real," it only rejects an empty selection (see schemas.ts).
 */
export async function registerSurgeryAction(
  _previousState: RegisterSurgeryFormState,
  formData: FormData,
): Promise<RegisterSurgeryFormState> {
  const parsed = registerSurgerySchema.safeParse({
    patientId: formData.get("patientId"),
    procedureTypeId: formData.get("procedureTypeId"),
    performedAt: formData.get("performedAt"),
  });
  if (!parsed.success) {
    return { error: "Please select a patient, a procedure type, and a performed date." };
  }

  let response: RegisterSurgeryResponse;
  try {
    response = await authedApiRequest<RegisterSurgeryResponse>({
      method: "POST",
      path: "/surgeries",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/surgeries/${response.surgeryId}`);
}

export interface RecordControlFormState {
  error?: string;
}

/**
 * Bound to a specific `surgeryId` by the calling Client Component
 * (`RecordControlForm.tsx`) via `.bind(null, surgeryId)` — the standard
 * Next.js pattern for passing context into a Server Action beyond what
 * the submitted form fields carry, since a surgery's id is never a
 * value the physician types or selects.
 */
export async function recordControlAction(
  surgeryId: string,
  _previousState: RecordControlFormState,
  formData: FormData,
): Promise<RecordControlFormState> {
  const authorType = formData.get("authorType");
  const parsed = recordControlSchema.safeParse(
    authorType === "resident"
      ? {
          authorType: "resident",
          residentId: formData.get("residentId"),
          observations: formData.get("observations"),
          recordedAt: formData.get("recordedAt"),
        }
      : {
          authorType: "physician",
          observations: formData.get("observations"),
          recordedAt: formData.get("recordedAt"),
        },
  );
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    await authedApiRequest<RecordControlResponse>({
      method: "POST",
      path: `/surgeries/${surgeryId}/controls`,
      body: {
        observations: parsed.data.observations,
        recordedAt: parsed.data.recordedAt,
        author:
          parsed.data.authorType === "resident"
            ? { type: "resident", residentId: parsed.data.residentId }
            : { type: "physician" },
      },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/surgeries/${surgeryId}`);
}

export interface ModifyControlFormState {
  error?: string;
}

/** Bound to `surgeryId`/`controlId` — same pattern as `recordControlAction`. */
export async function modifyControlAction(
  surgeryId: string,
  controlId: string,
  _previousState: ModifyControlFormState,
  formData: FormData,
): Promise<ModifyControlFormState> {
  const parsed = modifyControlSchema.safeParse({
    observations: formData.get("observations") || undefined,
    recordedAt: formData.get("recordedAt") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the values entered." };
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

  redirect(`/surgeries/${surgeryId}`);
}

export interface AssignResidentFormState {
  error?: string;
}

/**
 * `POST /surgeries/:id/residents` — bound to `surgeryId`, same pattern
 * as `recordControlAction`. Lives here, not in
 * `features/residents/actions.ts`, mirroring `api` itself:
 * `assignResidentToSurgery`/`removeResidentFromSurgery` are both defined
 * in `packages/application/src/surgery/`, not `resident/` — this is
 * Surgery's own operation on its aggregate, not a Resident-owned one.
 * See `docs/architecture/milestone-8-design.md` §8 for the same
 * reasoning applied to where the UI itself lives.
 */
export async function assignResidentAction(
  surgeryId: string,
  _previousState: AssignResidentFormState,
  formData: FormData,
): Promise<AssignResidentFormState> {
  const parsed = assignResidentSchema.safeParse({ residentId: formData.get("residentId") });
  if (!parsed.success) {
    return { error: "Please select a resident." };
  }

  try {
    await authedApiRequest({
      method: "POST",
      path: `/surgeries/${surgeryId}/residents`,
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/surgeries/${surgeryId}`);
}

export interface RemoveResidentFormState {
  error?: string;
}

/**
 * `DELETE /surgeries/:id/residents/:residentId` — bound to both ids.
 * `Surgery.removeResident` rejects removal once the resident has
 * recorded a Control on this surgery (the participation-preservation
 * invariant, ADR 0010) — that rejection surfaces here as an
 * `ApiDomainError`, shown inline exactly as `api` phrased it, never a
 * client-side pre-check of "has this resident already participated."
 */
export async function removeResidentAction(
  surgeryId: string,
  residentId: string,
  _previousState: RemoveResidentFormState,
): Promise<RemoveResidentFormState> {
  try {
    await authedApiRequest({
      method: "DELETE",
      path: `/surgeries/${surgeryId}/residents/${residentId}`,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/surgeries/${surgeryId}`);
}

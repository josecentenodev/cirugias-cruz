"use server";

import type { ActionResult } from "@/lib/action-result";
import { authedApiRequest } from "@/lib/authed-api-request";
import { runFormAction } from "@/lib/form-action";
import {
  collectCustomFieldValues,
  hasCustomFieldInputs,
  type CollectedCustomFieldValue,
} from "@/features/procedure-types/custom-field-values";
import type { CustomFieldDto } from "@/features/procedure-types/dtos";
import { listProcedureTypes } from "@/features/procedure-types/queries";
import { messages } from "@/messages/en";
import type { RecordControlResponse, RegisterSurgeryResponse } from "./dtos";
import { getSurgery } from "./queries";
import {
  assignResidentSchema,
  modifyControlSchema,
  recordControlSchema,
  registerSurgerySchema,
} from "./schemas";

/**
 * Every action here goes through `runFormAction`
 * (docs/architecture/milestone-12-form-feedback-design.md) — feedback is
 * centralized there. Actions are bound to `patientId`/`surgeryId`/… via
 * `.bind(null, …)`; `patientId` is only used to redirect back to the
 * patient-nested Surgery URL (Milestone 10 IA) — `api` never sees it.
 */

const surgeryPath = (patientId: string, surgeryId: string) =>
  `/patients/${patientId}/surgeries/${surgeryId}`;

/**
 * The `SURGERY`/`CONTROL`-scoped CustomField definitions for a Procedure
 * Type, re-read server-side so the Server Action never trusts the client
 * about a field's type or scope — `collectCustomFieldValues` coerces
 * against these, and `api` re-validates regardless.
 */
async function scopedCustomFields(
  procedureTypeId: string,
  scope: CustomFieldDto["scope"],
): Promise<CustomFieldDto[]> {
  const procedureTypes = await listProcedureTypes();
  const procedureType = procedureTypes.find((candidate) => candidate.id === procedureTypeId);
  return (procedureType?.customFields ?? []).filter((field) => field.scope === scope);
}

/**
 * `POST /surgeries`. `api` itself verifies the referenced patient/
 * procedure type exist and belong to this tenant; a mismatch surfaces
 * inline unchanged — this form never pre-validates that a selected id is
 * "real," it only rejects an empty selection (see schemas.ts).
 */
export async function registerSurgeryAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: registerSurgerySchema,
    input: (fd) => ({
      patientId: fd.get("patientId"),
      procedureTypeId: fd.get("procedureTypeId"),
      performedAt: fd.get("performedAt"),
    }),
    invalidMessage: messages.errors.surgeryFields,
    run: async (data) => {
      const customFieldValues = hasCustomFieldInputs(formData)
        ? collectCustomFieldValues(
            formData,
            await scopedCustomFields(data.procedureTypeId, "SURGERY"),
          )
        : [];
      const response = await authedApiRequest<RegisterSurgeryResponse>({
        method: "POST",
        path: "/surgeries",
        body: customFieldValues.length > 0 ? { ...data, customFieldValues } : data,
      });
      return { patientId: data.patientId, surgeryId: response.surgeryId };
    },
    success: (created) => ({
      message: "surgeryRegistered",
      redirectTo: surgeryPath(created.patientId, created.surgeryId),
    }),
  });
}

/** `POST /surgeries/:id/controls` — the physician records a Control, as themselves or on a resident's behalf. */
export async function recordControlAction(
  patientId: string,
  surgeryId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: recordControlSchema,
    input: (fd) => {
      const shared = {
        observations: fd.get("observations") || undefined,
        recordedAt: fd.get("recordedAt"),
        definitionId: fd.get("definitionId"),
      };
      return fd.get("authorType") === "resident"
        ? { ...shared, authorType: "resident", residentId: fd.get("residentId") }
        : { ...shared, authorType: "physician" };
    },
    run: async (data) => {
      let customFieldValues: CollectedCustomFieldValue[] = [];
      if (hasCustomFieldInputs(formData)) {
        const surgery = await getSurgery(surgeryId);
        customFieldValues = collectCustomFieldValues(
          formData,
          await scopedCustomFields(surgery.procedureTypeId, "CONTROL"),
        );
      }
      await authedApiRequest<RecordControlResponse>({
        method: "POST",
        path: `/surgeries/${surgeryId}/controls`,
        body: {
          ...(data.observations ? { observations: data.observations } : {}),
          recordedAt: data.recordedAt,
          author:
            data.authorType === "resident"
              ? { type: "resident", residentId: data.residentId }
              : { type: "physician" },
          definitionId: data.definitionId,
          ...(customFieldValues.length > 0 ? { customFieldValues } : {}),
        },
      });
    },
    success: { message: "controlRecorded", redirectTo: surgeryPath(patientId, surgeryId) },
  });
}

/** `PATCH /surgeries/:id/controls/:controlId`. */
export async function modifyControlAction(
  patientId: string,
  surgeryId: string,
  controlId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: modifyControlSchema,
    input: (fd) => ({
      observations: fd.get("observations") || undefined,
      recordedAt: fd.get("recordedAt") || undefined,
    }),
    invalidMessage: messages.errors.invalidValues,
    run: (body) =>
      authedApiRequest({
        method: "PATCH",
        path: `/surgeries/${surgeryId}/controls/${controlId}`,
        body,
      }),
    success: { message: "controlUpdated", redirectTo: surgeryPath(patientId, surgeryId) },
  });
}

/**
 * `POST /surgeries/:id/residents`. Lives here, not in
 * `features/residents/actions.ts`, mirroring `api` itself:
 * assign/remove are Surgery's own operations on its aggregate
 * (`packages/application/src/surgery/`), not Resident-owned ones.
 */
export async function assignResidentAction(
  patientId: string,
  surgeryId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: assignResidentSchema,
    input: (fd) => ({ residentId: fd.get("residentId") }),
    invalidMessage: messages.errors.selectResident,
    run: (body) =>
      authedApiRequest({ method: "POST", path: `/surgeries/${surgeryId}/residents`, body }),
    success: { message: "residentAssigned", redirectTo: surgeryPath(patientId, surgeryId) },
  });
}

/**
 * `DELETE /surgeries/:id/residents/:residentId`. `Surgery.removeResident`
 * rejects removal once the resident has recorded a Control on this
 * surgery (ADR 0010) — shown inline exactly as `api` phrased it, never a
 * client-side pre-check.
 */
export async function removeResidentAction(
  patientId: string,
  surgeryId: string,
  residentId: string,
  _previous: ActionResult,
  formData?: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: () =>
      authedApiRequest({
        method: "DELETE",
        path: `/surgeries/${surgeryId}/residents/${residentId}`,
      }),
    success: { message: "residentRemoved", redirectTo: surgeryPath(patientId, surgeryId) },
  });
}

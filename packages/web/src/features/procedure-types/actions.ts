"use server";

import type { ActionResult } from "@/lib/action-result";
import { authedApiRequest } from "@/lib/authed-api-request";
import { runFormAction } from "@/lib/form-action";
import { messages } from "@/messages/en";
import type { AddControlDefinitionResponse, AddCustomFieldResponse } from "./dtos";
import {
  addCustomFieldSchema,
  controlDefinitionSchema,
  modifyProcedureTypeSchema,
  registerProcedureTypeSchema,
  toOccurrenceRuleBody,
  type AddCustomFieldInput,
} from "./schemas";

/**
 * Every action here goes through `runFormAction`
 * (docs/architecture/milestone-12-form-feedback-design.md) — error and
 * success feedback are centralized there; each action only says what to
 * parse, what to call, and where success leads. Actions bound with ids
 * (`.bind(null, procedureTypeId, …)`) keep the standard Next pattern for
 * passing context beyond the submitted fields.
 */

const detailPath = (procedureTypeId: string) => `/settings/procedure-types/${procedureTypeId}`;

/**
 * `valueType` picks which branch of `addCustomFieldSchema`'s
 * discriminated union to parse against — shared by add + edit.
 */
function customFieldInput(fd: FormData) {
  const valueType = fd.get("valueType");
  const shared = {
    name: fd.get("name"),
    description: fd.get("description") || undefined,
    scope: fd.get("scope"),
  };
  return valueType === "ENUM"
    ? { ...shared, valueType: "ENUM", options: fd.get("options") ?? "" }
    : valueType === "TEXT"
      ? { ...shared, valueType: "TEXT", maxLength: fd.get("maxLength") || undefined }
      : {
          ...shared,
          valueType: "NUMBER",
          unit: fd.get("unit") || undefined,
          min: fd.get("min") || undefined,
          max: fd.get("max") || undefined,
        };
}

/**
 * Reassembles the flat parsed CustomField fields into `api`'s nested
 * `constraint` body. `api` (`ProcedureType.addCustomField`) remains the
 * sole authority on name-uniqueness and constraint coherence; this only
 * shapes the request.
 */
function toCustomFieldBody(input: AddCustomFieldInput) {
  const { name, description, scope } = input;
  const constraint =
    input.valueType === "NUMBER"
      ? { valueType: "NUMBER" as const, unit: input.unit, min: input.min, max: input.max }
      : input.valueType === "ENUM"
        ? { valueType: "ENUM" as const, options: input.options }
        : { valueType: "TEXT" as const, maxLength: input.maxLength };
  return { name, description, scope, constraint };
}

function controlDefinitionInput(fd: FormData) {
  return {
    name: fd.get("name"),
    mode: fd.get("mode"),
    count: fd.get("count") || undefined,
    every: fd.get("every") || undefined,
    unit: fd.get("unit") || undefined,
  };
}

/** `POST /procedure-types`. */
export async function registerProcedureTypeAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: registerProcedureTypeSchema,
    input: (fd) => ({
      name: fd.get("name"),
      description: fd.get("description") || undefined,
    }),
    run: (body) => authedApiRequest({ method: "POST", path: "/procedure-types", body }),
    success: { message: "procedureTypeCreated", redirectTo: "/settings/procedure-types" },
  });
}

/**
 * `PATCH /procedure-types/:id` — redirects back to the same detail page,
 * which is how this app re-fetches fresh data after a Server Action.
 */
export async function modifyProcedureTypeAction(
  procedureTypeId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: modifyProcedureTypeSchema,
    input: (fd) => ({
      name: fd.get("name") || undefined,
      description: fd.get("description") || undefined,
    }),
    invalidMessage: messages.errors.invalidValues,
    run: (body) =>
      authedApiRequest({ method: "PATCH", path: `/procedure-types/${procedureTypeId}`, body }),
    success: { message: "procedureTypeUpdated", redirectTo: detailPath(procedureTypeId) },
  });
}

/** `POST /procedure-types/:id/custom-fields`. */
export async function addCustomFieldAction(
  procedureTypeId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: addCustomFieldSchema,
    input: customFieldInput,
    run: (input) =>
      authedApiRequest<AddCustomFieldResponse>({
        method: "POST",
        path: `/procedure-types/${procedureTypeId}/custom-fields`,
        body: toCustomFieldBody(input),
      }),
    success: { message: "customFieldAdded", redirectTo: detailPath(procedureTypeId) },
  });
}

/**
 * `PATCH /procedure-types/:id/custom-fields/:fieldId` — a wholesale
 * all-or-nothing replace (ADR 0027). `api` rejects it with 400 when the
 * field already has recorded data ("frozen"); shown inline.
 */
export async function editCustomFieldAction(
  procedureTypeId: string,
  fieldId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: addCustomFieldSchema,
    input: customFieldInput,
    run: (input) =>
      authedApiRequest({
        method: "PATCH",
        path: `/procedure-types/${procedureTypeId}/custom-fields/${fieldId}`,
        body: toCustomFieldBody(input),
      }),
    success: { message: "customFieldUpdated", redirectTo: detailPath(procedureTypeId) },
  });
}

/** `DELETE /procedure-types/:id/custom-fields/:fieldId` — allowed only while unused (ADR 0027). */
export async function removeCustomFieldAction(
  procedureTypeId: string,
  fieldId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: () =>
      authedApiRequest({
        method: "DELETE",
        path: `/procedure-types/${procedureTypeId}/custom-fields/${fieldId}`,
      }),
    success: { message: "customFieldRemoved", redirectTo: detailPath(procedureTypeId) },
  });
}

/** `POST /procedure-types/:id/control-definitions` (ADR 0026). Adding is always allowed. */
export async function addControlDefinitionAction(
  procedureTypeId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: controlDefinitionSchema,
    input: controlDefinitionInput,
    run: (data) =>
      authedApiRequest<AddControlDefinitionResponse>({
        method: "POST",
        path: `/procedure-types/${procedureTypeId}/control-definitions`,
        body: { name: data.name, occurrenceRule: toOccurrenceRuleBody(data) },
      }),
    success: { message: "controlDefinitionAdded", redirectTo: detailPath(procedureTypeId) },
  });
}

/** `PATCH /procedure-types/:id/control-definitions/:defId` — rejected 400 when frozen (ADR 0027). */
export async function editControlDefinitionAction(
  procedureTypeId: string,
  defId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: controlDefinitionSchema,
    input: controlDefinitionInput,
    run: (data) =>
      authedApiRequest({
        method: "PATCH",
        path: `/procedure-types/${procedureTypeId}/control-definitions/${defId}`,
        body: { name: data.name, occurrenceRule: toOccurrenceRuleBody(data) },
      }),
    success: { message: "controlDefinitionUpdated", redirectTo: detailPath(procedureTypeId) },
  });
}

/** `DELETE /procedure-types/:id/control-definitions/:defId` — allowed only while unused (ADR 0027). */
export async function removeControlDefinitionAction(
  procedureTypeId: string,
  defId: string,
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: () =>
      authedApiRequest({
        method: "DELETE",
        path: `/procedure-types/${procedureTypeId}/control-definitions/${defId}`,
      }),
    success: { message: "controlDefinitionRemoved", redirectTo: detailPath(procedureTypeId) },
  });
}

"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError, ApiNotFoundError } from "@/lib/api-errors";
import type { AddControlDefinitionResponse, AddCustomFieldResponse } from "./dtos";
import {
  addCustomFieldSchema,
  controlDefinitionSchema,
  modifyProcedureTypeSchema,
  registerProcedureTypeSchema,
  toOccurrenceRuleBody,
} from "./schemas";

/** Reassembles the flat CustomField form fields into `api`'s nested `constraint` body — shared by add + edit. */
function parseCustomFieldForm(formData: FormData) {
  const valueType = formData.get("valueType");
  const shared = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    scope: formData.get("scope"),
  };
  const parsed = addCustomFieldSchema.safeParse(
    valueType === "ENUM"
      ? { ...shared, valueType: "ENUM", options: formData.get("options") ?? "" }
      : valueType === "TEXT"
        ? { ...shared, valueType: "TEXT", maxLength: formData.get("maxLength") || undefined }
        : {
            ...shared,
            valueType: "NUMBER",
            unit: formData.get("unit") || undefined,
            min: formData.get("min") || undefined,
            max: formData.get("max") || undefined,
          },
  );
  if (!parsed.success) {
    return null;
  }
  const { name, description, scope } = parsed.data;
  const constraint =
    parsed.data.valueType === "NUMBER"
      ? {
          valueType: "NUMBER" as const,
          unit: parsed.data.unit,
          min: parsed.data.min,
          max: parsed.data.max,
        }
      : parsed.data.valueType === "ENUM"
        ? { valueType: "ENUM" as const, options: parsed.data.options }
        : { valueType: "TEXT" as const, maxLength: parsed.data.maxLength };
  return { name, description, scope, constraint };
}

export interface RegisterProcedureTypeFormState {
  error?: string;
}

/**
 * `POST /procedure-types`, through `authedApiRequest` — 401 handling is
 * centralized there. An `ApiDomainError` is returned as a typed form
 * error, displayed as-is. Anything else propagates uncaught into the
 * nearest `error.tsx`. Mirrors `features/patients/actions.ts`'s
 * `registerPatientAction` exactly.
 */
export async function registerProcedureTypeAction(
  _previousState: RegisterProcedureTypeFormState,
  formData: FormData,
): Promise<RegisterProcedureTypeFormState> {
  const parsed = registerProcedureTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    await authedApiRequest({ method: "POST", path: "/procedure-types", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/settings/procedure-types");
}

export interface ModifyProcedureTypeFormState {
  error?: string;
}

/**
 * `PATCH /procedure-types/:id` — bound to `procedureTypeId`, same pattern
 * as `features/surgeries/actions.ts`'s `modifyControlAction`. Redirects
 * back to the same detail page on success (mirrors `assignResidentAction`),
 * which is how this app re-fetches fresh data after a Server Action
 * rather than a client-side `revalidatePath` call.
 */
export async function modifyProcedureTypeAction(
  procedureTypeId: string,
  _previousState: ModifyProcedureTypeFormState,
  formData: FormData,
): Promise<ModifyProcedureTypeFormState> {
  const parsed = modifyProcedureTypeSchema.safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the values entered." };
  }

  try {
    await authedApiRequest({
      method: "PATCH",
      path: `/procedure-types/${procedureTypeId}`,
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

export interface AddCustomFieldFormState {
  error?: string;
}

/**
 * `POST /procedure-types/:id/custom-fields` — bound to `procedureTypeId`.
 * `valueType` picks which branch of `addCustomFieldSchema`'s
 * discriminated union to parse against, same technique
 * `recordControlAction` already uses for `authorType`. The flat parsed
 * fields are reassembled into the nested `constraint` shape `api`
 * actually expects — `api` itself (`ProcedureType.addCustomField`)
 * remains the sole authority on name-uniqueness and constraint coherence;
 * this only shapes the request.
 */
export async function addCustomFieldAction(
  procedureTypeId: string,
  _previousState: AddCustomFieldFormState,
  formData: FormData,
): Promise<AddCustomFieldFormState> {
  const valueType = formData.get("valueType");
  const shared = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    scope: formData.get("scope"),
  };

  const parsed = addCustomFieldSchema.safeParse(
    valueType === "ENUM"
      ? { ...shared, valueType: "ENUM", options: formData.get("options") ?? "" }
      : valueType === "TEXT"
        ? { ...shared, valueType: "TEXT", maxLength: formData.get("maxLength") || undefined }
        : {
            ...shared,
            valueType: "NUMBER",
            unit: formData.get("unit") || undefined,
            min: formData.get("min") || undefined,
            max: formData.get("max") || undefined,
          },
  );
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  const { name, description, scope } = parsed.data;
  const constraint =
    parsed.data.valueType === "NUMBER"
      ? {
          valueType: "NUMBER" as const,
          unit: parsed.data.unit,
          min: parsed.data.min,
          max: parsed.data.max,
        }
      : parsed.data.valueType === "ENUM"
        ? { valueType: "ENUM" as const, options: parsed.data.options }
        : { valueType: "TEXT" as const, maxLength: parsed.data.maxLength };

  try {
    await authedApiRequest<AddCustomFieldResponse>({
      method: "POST",
      path: `/procedure-types/${procedureTypeId}/custom-fields`,
      body: { name, description, scope, constraint },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

/**
 * `PATCH /procedure-types/:id/custom-fields/:fieldId` — a wholesale
 * all-or-nothing replace (ADR 0027). `api` rejects it with 400 when the
 * field already has recorded data ("frozen"); that message is surfaced
 * inline.
 */
export async function editCustomFieldAction(
  procedureTypeId: string,
  fieldId: string,
  _previousState: AddCustomFieldFormState,
  formData: FormData,
): Promise<AddCustomFieldFormState> {
  const body = parseCustomFieldForm(formData);
  if (!body) {
    return { error: "Please fill in every required field." };
  }
  try {
    await authedApiRequest({
      method: "PATCH",
      path: `/procedure-types/${procedureTypeId}/custom-fields/${fieldId}`,
      body,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

/** `DELETE /procedure-types/:id/custom-fields/:fieldId` — allowed only while unused (ADR 0027). */
export async function removeCustomFieldAction(
  procedureTypeId: string,
  fieldId: string,
  _previousState: AddCustomFieldFormState,
  _formData: FormData,
): Promise<AddCustomFieldFormState> {
  try {
    await authedApiRequest({
      method: "DELETE",
      path: `/procedure-types/${procedureTypeId}/custom-fields/${fieldId}`,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

export interface ControlDefinitionFormState {
  error?: string;
}

function parseControlDefinitionForm(formData: FormData) {
  const parsed = controlDefinitionSchema.safeParse({
    name: formData.get("name"),
    mode: formData.get("mode"),
    count: formData.get("count") || undefined,
    every: formData.get("every") || undefined,
    unit: formData.get("unit") || undefined,
  });
  return parsed.success ? parsed.data : null;
}

/** `POST /procedure-types/:id/control-definitions` (ADR 0026). Adding is always allowed. */
export async function addControlDefinitionAction(
  procedureTypeId: string,
  _previousState: ControlDefinitionFormState,
  formData: FormData,
): Promise<ControlDefinitionFormState> {
  const data = parseControlDefinitionForm(formData);
  if (!data) {
    return { error: "Please fill in every required field." };
  }
  try {
    await authedApiRequest<AddControlDefinitionResponse>({
      method: "POST",
      path: `/procedure-types/${procedureTypeId}/control-definitions`,
      body: { name: data.name, occurrenceRule: toOccurrenceRuleBody(data) },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

/** `PATCH /procedure-types/:id/control-definitions/:defId` — rejected 400 when frozen (ADR 0027). */
export async function editControlDefinitionAction(
  procedureTypeId: string,
  defId: string,
  _previousState: ControlDefinitionFormState,
  formData: FormData,
): Promise<ControlDefinitionFormState> {
  const data = parseControlDefinitionForm(formData);
  if (!data) {
    return { error: "Please fill in every required field." };
  }
  try {
    await authedApiRequest({
      method: "PATCH",
      path: `/procedure-types/${procedureTypeId}/control-definitions/${defId}`,
      body: { name: data.name, occurrenceRule: toOccurrenceRuleBody(data) },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

/** `DELETE /procedure-types/:id/control-definitions/:defId` — allowed only while unused (ADR 0027). */
export async function removeControlDefinitionAction(
  procedureTypeId: string,
  defId: string,
  _previousState: ControlDefinitionFormState,
  _formData: FormData,
): Promise<ControlDefinitionFormState> {
  try {
    await authedApiRequest({
      method: "DELETE",
      path: `/procedure-types/${procedureTypeId}/control-definitions/${defId}`,
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
  redirect(`/settings/procedure-types/${procedureTypeId}`);
}

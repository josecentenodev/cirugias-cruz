"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError } from "@/lib/api-errors";
import { registerProcedureTypeSchema } from "./schemas";

export interface RegisterProcedureTypeFormState {
  error?: string;
}

/**
 * `POST /procedure-types`, through `authedApiRequest` — 401 handling is
 * centralized there, not repeated here. An `ApiDomainError` is returned
 * as a typed form error, displayed as-is. Anything else propagates
 * uncaught into the nearest `error.tsx`. Mirrors
 * `features/patients/actions.ts`'s `registerPatientAction` exactly.
 */
export async function registerProcedureTypeAction(
  _previousState: RegisterProcedureTypeFormState,
  formData: FormData,
): Promise<RegisterProcedureTypeFormState> {
  const parsed = registerProcedureTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    technique: formData.get("technique") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    // No detail page to redirect to (see queries.ts) — the response's
    // `procedureTypeId` isn't needed here.
    await authedApiRequest({ method: "POST", path: "/procedure-types", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/procedure-types");
}

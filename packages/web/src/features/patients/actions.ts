"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError } from "@/lib/api-errors";
import type { RegisterPatientResponse } from "./dtos";
import { registerPatientSchema } from "./schemas";

export interface RegisterPatientFormState {
  error?: string;
}

/**
 * `POST /patients`, through `authedApiRequest` (§2 of
 * docs/architecture/milestone-8-design.md — 401 handling is centralized
 * there, not repeated here). An `ApiDomainError` (a real Domain
 * rejection — e.g. a required field Domain itself considers blank after
 * trimming) is returned as a typed form error, exactly as documented in
 * §7: displayed as-is, never reworded. Anything else (network failure,
 * 500) is left to propagate uncaught into the nearest `error.tsx`.
 */
export async function registerPatientAction(
  _previousState: RegisterPatientFormState,
  formData: FormData,
): Promise<RegisterPatientFormState> {
  const parsed = registerPatientSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth"),
    observations: formData.get("observations") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  let response: RegisterPatientResponse;
  try {
    response = await authedApiRequest<RegisterPatientResponse>({
      method: "POST",
      path: "/patients",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/patients/${response.patientId}`);
}

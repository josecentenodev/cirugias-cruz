"use server";

import { redirect } from "next/navigation";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError } from "@/lib/api-errors";
import { registerResidentSchema } from "./schemas";

export interface RegisterResidentFormState {
  error?: string;
}

/** `POST /residents`, through `authedApiRequest`. Mirrors `registerPatientAction` exactly. */
export async function registerResidentAction(
  _previousState: RegisterResidentFormState,
  formData: FormData,
): Promise<RegisterResidentFormState> {
  const parsed = registerResidentSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth"),
  });
  if (!parsed.success) {
    return { error: "Please fill in every required field." };
  }

  try {
    await authedApiRequest({ method: "POST", path: "/residents", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/residents");
}

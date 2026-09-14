"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authedApiRequest } from "@/lib/authed-api-request";
import { ApiDomainError, ApiNotFoundError } from "@/lib/api-errors";
import { valuesFromFormData } from "@/lib/form-values";
import { registerResidentSchema } from "./schemas";

const REGISTER_RESIDENT_ECHO_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "dateOfBirth",
] as const;

export interface RegisterResidentFormState {
  error?: string;
  values?: Record<string, string>;
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
  const values = valuesFromFormData(formData, REGISTER_RESIDENT_ECHO_FIELDS);
  if (!parsed.success) {
    return { error: "Please fill in every required field.", values };
  }

  try {
    await authedApiRequest({ method: "POST", path: "/residents", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiDomainError) {
      return { error: error.message, values };
    }
    throw error;
  }

  redirect("/staff/residents");
}

export interface ResendInvitationFormState {
  sent?: boolean;
  error?: string;
}

/**
 * The "resend invitation" action (ADR 0029, replacing 0017's
 * "blanqueo") — `POST /residents/:id/resend-invitation`. Clears any
 * existing password on `api`'s side; the Resident cannot log in again
 * until they accept the fresh invitation.
 */
export async function resendResidentInvitationAction(
  residentId: string,
  _previousState: ResendInvitationFormState,
): Promise<ResendInvitationFormState> {
  try {
    await authedApiRequest({ method: "POST", path: `/residents/${residentId}/resend-invitation` });
    return { sent: true };
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
}

export interface SetResidentActiveFormState {
  error?: string;
  succeededActive?: boolean;
}

/**
 * `PATCH /residents/:id/active` — deactivating forces the immediate
 * closure of any session that Resident currently holds (`api`'s own
 * behavior, ADR 0017 decision item 9; nothing extra needed here).
 * `revalidatePath`, not `redirect`: called from a small inline form on
 * the list page itself, which should just refresh in place. Returns a
 * result (rather than `void`) so the calling component can show visible
 * success/error feedback instead of a silent mutation.
 */
export async function setResidentActiveAction(
  residentId: string,
  active: boolean,
  _previousState: SetResidentActiveFormState,
): Promise<SetResidentActiveFormState> {
  try {
    await authedApiRequest({
      method: "PATCH",
      path: `/residents/${residentId}/active`,
      body: { active },
    });
  } catch (error) {
    if (error instanceof ApiDomainError || error instanceof ApiNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath("/staff/residents");
  return { succeededActive: active };
}

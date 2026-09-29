"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { authedApiRequest } from "@/lib/authed-api-request";
import { runFormAction } from "@/lib/form-action";
import { registerResidentSchema } from "./schemas";

/**
 * Every action here goes through `runFormAction`
 * (docs/architecture/milestone-12-form-feedback-design.md) — feedback is
 * centralized there.
 */

/** `POST /residents` — `api` also sends the invitation email (ADR 0029). */
export async function registerResidentAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: registerResidentSchema,
    input: (fd) => ({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      dateOfBirth: fd.get("dateOfBirth"),
    }),
    run: (body) => authedApiRequest({ method: "POST", path: "/residents", body }),
    success: { message: "residentRegistered", redirectTo: "/staff/residents" },
  });
}

/**
 * The "resend invitation" action (ADR 0029, replacing 0017's
 * "blanqueo") — `POST /residents/:id/resend-invitation`. Clears any
 * existing password on `api`'s side; the Resident cannot log in again
 * until they accept the fresh invitation. Called from the list row
 * itself, so it refreshes in place rather than redirecting.
 */
export async function resendResidentInvitationAction(
  residentId: string,
  _previous: ActionResult,
  formData?: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: async () => {
      await authedApiRequest({
        method: "POST",
        path: `/residents/${residentId}/resend-invitation`,
      });
      revalidatePath("/staff/residents");
    },
    success: { message: "invitationResent" },
  });
}

/**
 * `PATCH /residents/:id/active` — deactivating forces the immediate
 * closure of any session that Resident currently holds (`api`'s own
 * behavior, ADR 0017 decision item 9; nothing extra needed here).
 * `revalidatePath`, not `redirect`: called from a small inline form on
 * the list page itself, which should just refresh in place.
 */
export async function setResidentActiveAction(
  residentId: string,
  active: boolean,
  _previous: ActionResult,
  formData?: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    run: async () => {
      await authedApiRequest({
        method: "PATCH",
        path: `/residents/${residentId}/active`,
        body: { active },
      });
      revalidatePath("/staff/residents");
    },
    success: { message: active ? "residentReactivated" : "residentDeactivated" },
  });
}

"use server";

import type { ActionResult } from "@/lib/action-result";
import { authedApiRequest } from "@/lib/authed-api-request";
import { runFormAction } from "@/lib/form-action";
import type { RegisterPatientResponse } from "./dtos";
import { registerPatientSchema } from "./schemas";

/**
 * `POST /patients`, through `authedApiRequest` (401 → `/login` is
 * centralized there). Error/success feedback is `runFormAction`'s job
 * (docs/architecture/milestone-12-form-feedback-design.md) — a Domain
 * rejection (e.g. a duplicate DNI) is shown inline verbatim, anything
 * unexpected as the generic inline message.
 */
export async function registerPatientAction(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return runFormAction(formData, {
    schema: registerPatientSchema,
    input: (fd) => ({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      dateOfBirth: fd.get("dateOfBirth"),
      dni: fd.get("dni") || undefined,
      observations: fd.get("observations") || undefined,
    }),
    run: (body) =>
      authedApiRequest<RegisterPatientResponse>({ method: "POST", path: "/patients", body }),
    success: (response) => ({
      message: "patientRegistered",
      redirectTo: `/patients/${response.patientId}`,
    }),
  });
}

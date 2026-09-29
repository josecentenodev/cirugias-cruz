import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors.js";
import { messages } from "@/messages/en";
import {
  formData,
  lastFlashKey,
  redirectMock,
  resetNextActionMocks,
} from "@/test/next-action-mocks";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request.js", () => ({ authedApiRequest: authedApiRequestMock }));

const { registerPatientAction } = await import("./actions.js");

function validPatientFields(overrides: Record<string, string> = {}) {
  return {
    firstName: "Ana",
    lastName: "García",
    dateOfBirth: "1990-01-01",
    ...overrides,
  };
}

describe("registerPatientAction", () => {
  beforeEach(() => {
    authedApiRequestMock.mockReset();
    resetNextActionMocks();
  });

  it("succeeds: calls POST /patients, flashes a success toast and redirects to the new patient", async () => {
    authedApiRequestMock.mockResolvedValue({ patientId: "patient-1" });

    await expect(registerPatientAction(idleResult, formData(validPatientFields()))).rejects.toThrow(
      "NEXT_REDIRECT:/patients/patient-1",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/patients",
      body: {
        firstName: "Ana",
        lastName: "García",
        dateOfBirth: "1990-01-01",
      },
    });
    expect(lastFlashKey()).toBe("patientRegistered");
  });

  it("includes the dni in the body when provided", async () => {
    authedApiRequestMock.mockResolvedValue({ patientId: "patient-1" });

    await expect(
      registerPatientAction(idleResult, formData(validPatientFields({ dni: "30111222" }))),
    ).rejects.toThrow("NEXT_REDIRECT:/patients/patient-1");

    const call = authedApiRequestMock.mock.calls[0]?.[0] as { body: { dni?: string } };
    expect(call.body.dni).toBe("30111222");
  });

  it("surfaces api's duplicate-dni rejection inline, keeping what was typed", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A patient with this DNI already exists"),
    );

    const result = await registerPatientAction(
      idleResult,
      formData(validPatientFields({ dni: "30111222" })),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "A patient with this DNI already exists",
      values: { firstName: "Ana", dni: "30111222" },
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects a missing required field before ever calling api, naming the field", async () => {
    const result = await registerPatientAction(
      idleResult,
      formData(validPatientFields({ firstName: "" })),
    );

    expect(result).toMatchObject({
      status: "error",
      message: messages.errors.requiredFields,
      fieldErrors: { firstName: "First name is required" },
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("unexpected error: shown inline as the generic message — the form survives instead of error.tsx", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    const result = await registerPatientAction(idleResult, formData(validPatientFields()));

    expect(result).toMatchObject({
      status: "error",
      message: messages.errors.unexpected,
      values: { firstName: "Ana" },
    });
  });
});

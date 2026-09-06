import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors.js";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request.js", () => ({ authedApiRequest: authedApiRequestMock }));

class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}
redirectMock.mockImplementation((path: string) => {
  throw new FakeRedirectSignal(path);
});

const { registerPatientAction } = await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

function validPatientFields(overrides: Record<string, string> = {}) {
  return {
    firstName: "Ana",
    lastName: "García",
    phone: "555-0101",
    email: "ana@example.com",
    dateOfBirth: "1990-01-01",
    ...overrides,
  };
}

describe("registerPatientAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls POST /patients through authedApiRequest and redirects to the new patient's detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ patientId: "patient-1" });

    await expect(registerPatientAction({}, formData(validPatientFields()))).rejects.toThrow(
      "NEXT_REDIRECT:/patients/patient-1",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/patients",
      body: {
        firstName: "Ana",
        lastName: "García",
        phone: "555-0101",
        email: "ana@example.com",
        dateOfBirth: "1990-01-01",
      },
    });
  });

  it("includes the dni in the body when provided", async () => {
    authedApiRequestMock.mockResolvedValue({ patientId: "patient-1" });

    await expect(
      registerPatientAction({}, formData(validPatientFields({ dni: "30111222" }))),
    ).rejects.toThrow("NEXT_REDIRECT:/patients/patient-1");

    const call = authedApiRequestMock.mock.calls[0]?.[0] as { body: { dni?: string } };
    expect(call.body.dni).toBe("30111222");
  });

  it("surfaces api's duplicate-dni rejection inline", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A patient with this DNI already exists"),
    );

    const result = await registerPatientAction(
      {},
      formData(validPatientFields({ dni: "30111222" })),
    );

    expect(result).toEqual({ error: "A patient with this DNI already exists" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects a missing required field before ever calling api", async () => {
    const result = await registerPatientAction({}, formData(validPatientFields({ firstName: "" })));

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("firstName is required"));

    const result = await registerPatientAction({}, formData(validPatientFields()));

    expect(result).toEqual({ error: "firstName is required" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary, not returned as a form error", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(registerPatientAction({}, formData(validPatientFields()))).rejects.toBeInstanceOf(
      ApiUnexpectedError,
    );
  });
});

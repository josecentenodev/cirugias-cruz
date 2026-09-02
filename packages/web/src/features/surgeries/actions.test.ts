import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDomainError, ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

class FakeRedirectSignal extends Error {
  constructor(public readonly path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}
redirectMock.mockImplementation((path: string) => {
  throw new FakeRedirectSignal(path);
});

const { modifyControlAction, recordControlAction, registerSurgeryAction } =
  await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("registerSurgeryAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls POST /surgeries and redirects to the new surgery's detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "surgery-1" });

    await expect(
      registerSurgeryAction(
        {},
        formData({ patientId: "patient-1", procedureTypeId: "pt-1", performedAt: "2026-01-15" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/surgeries/surgery-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/surgeries",
      body: { patientId: "patient-1", procedureTypeId: "pt-1", performedAt: "2026-01-15" },
    });
  });

  it("rejects an incomplete selection before ever calling api", async () => {
    const result = await registerSurgeryAction(
      {},
      formData({ patientId: "", procedureTypeId: "pt-1", performedAt: "2026-01-15" }),
    );

    expect(result).toEqual({
      error: "Please select a patient, a procedure type, and a performed date.",
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's cross-tenant DomainError inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A surgery may only reference a patient within the same tenant"),
    );

    const result = await registerSurgeryAction(
      {},
      formData({ patientId: "patient-1", procedureTypeId: "pt-1", performedAt: "2026-01-15" }),
    );

    expect(result).toEqual({
      error: "A surgery may only reference a patient within the same tenant",
    });
  });

  it("expectable error: surfaces api's NotFoundError (a referenced id doesn't exist) inline", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiNotFoundError("Patient patient-1 was not found"));

    const result = await registerSurgeryAction(
      {},
      formData({ patientId: "patient-1", procedureTypeId: "pt-1", performedAt: "2026-01-15" }),
    );

    expect(result).toEqual({ error: "Patient patient-1 was not found" });
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      registerSurgeryAction(
        {},
        formData({ patientId: "patient-1", procedureTypeId: "pt-1", performedAt: "2026-01-15" }),
      ),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

describe("recordControlAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds recording as the physician: posts the physician-authored shape and redirects back to the surgery", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "surgery-1", controlId: "control-1" });

    await expect(
      recordControlAction(
        "surgery-1",
        {},
        formData({
          authorType: "physician",
          observations: "Evolución favorable",
          recordedAt: "2026-01-16T14:30",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/surgeries/surgery-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/surgeries/surgery-1/controls",
      body: {
        observations: "Evolución favorable",
        recordedAt: "2026-01-16T14:30",
        author: { type: "physician" },
      },
    });
  });

  it("succeeds recording as a resident: posts the resident-authored shape with the selected residentId", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "surgery-1", controlId: "control-1" });

    await expect(
      recordControlAction(
        "surgery-1",
        {},
        formData({
          authorType: "resident",
          residentId: "resident-1",
          observations: "Evolución favorable",
          recordedAt: "2026-01-16T14:30",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/surgeries/surgery-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/surgeries/surgery-1/controls",
      body: {
        observations: "Evolución favorable",
        recordedAt: "2026-01-16T14:30",
        author: { type: "resident", residentId: "resident-1" },
      },
    });
  });

  it("rejects a resident-authored submission missing which resident, before calling api", async () => {
    const result = await recordControlAction(
      "surgery-1",
      {},
      formData({ authorType: "resident", observations: "x", recordedAt: "2026-01-16T14:30" }),
    );

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("rejects missing observations before calling api", async () => {
    const result = await recordControlAction(
      "surgery-1",
      {},
      formData({ authorType: "physician", observations: "", recordedAt: "2026-01-16T14:30" }),
    );

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError (e.g. a resident no longer participating) inline", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("Only a currently participating resident may author a control"),
    );

    const result = await recordControlAction(
      "surgery-1",
      {},
      formData({
        authorType: "resident",
        residentId: "resident-1",
        observations: "x",
        recordedAt: "2026-01-16T14:30",
      }),
    );

    expect(result).toEqual({
      error: "Only a currently participating resident may author a control",
    });
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      recordControlAction(
        "surgery-1",
        {},
        formData({ authorType: "physician", observations: "x", recordedAt: "2026-01-16T14:30" }),
      ),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

describe("modifyControlAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: PATCHes only the provided fields and redirects back to the surgery", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "surgery-1", controlId: "control-1" });

    await expect(
      modifyControlAction(
        "surgery-1",
        "control-1",
        {},
        formData({ observations: "Updated observations" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/surgeries/surgery-1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/surgeries/surgery-1/controls/control-1",
      body: { observations: "Updated observations" },
    });
  });

  it("expectable error: surfaces api's DomainError inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Control control-1 was not found"));

    const result = await modifyControlAction(
      "surgery-1",
      "control-1",
      {},
      formData({ observations: "x" }),
    );

    expect(result).toEqual({ error: "Control control-1 was not found" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      modifyControlAction("surgery-1", "control-1", {}, formData({ observations: "x" })),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

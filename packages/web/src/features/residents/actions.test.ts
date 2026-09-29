import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { messages } from "@/messages/en";
import { formData, redirectMock, resetNextActionMocks } from "@/test/next-action-mocks";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const { revalidatePathMock } = vi.hoisted(() => ({ revalidatePathMock: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { registerResidentAction, resendResidentInvitationAction, setResidentActiveAction } =
  await import("./actions.js");

function validResidentFields(overrides: Record<string, string> = {}) {
  return {
    firstName: "Laura",
    lastName: "Díaz",
    phone: "+54 11 3333-3333",
    email: "laura@example.com",
    dateOfBirth: "1995-02-02",
    ...overrides,
  };
}

describe("registerResidentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: calls POST /residents through authedApiRequest and redirects to the list", async () => {
    authedApiRequestMock.mockResolvedValue({ residentId: "resident-1" });

    await expect(
      registerResidentAction(idleResult, formData(validResidentFields())),
    ).rejects.toThrow("NEXT_REDIRECT:/staff/residents");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/residents",
      body: validResidentFields(),
    });
  });

  it("rejects a missing required field before ever calling api, preserving what was typed", async () => {
    const result = await registerResidentAction(
      idleResult,
      formData(validResidentFields({ email: "" })),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Please fill in every required field.",
      values: validResidentFields({ email: "" }),
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged, preserving what was typed", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("firstName is required"));

    const result = await registerResidentAction(idleResult, formData(validResidentFields()));

    expect(result).toMatchObject({
      status: "error",
      message: "firstName is required",
      values: validResidentFields(),
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: is shown inline as the generic message — the form survives", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await registerResidentAction(idleResult, formData(validResidentFields()))).toMatchObject(
      {
        status: "error",
        message: messages.errors.unexpected,
      },
    );
  });
});

describe("resendResidentInvitationAction (ADR 0029)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("posts to the resend-invitation route and reports success", async () => {
    authedApiRequestMock.mockResolvedValue(undefined);

    const result = await resendResidentInvitationAction("resident-1", idleResult);

    expect(result).toMatchObject({
      status: "success",
      message: messages.feedback.invitationResent,
    });
    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/residents/resident-1/resend-invitation",
    });
  });

  it("surfaces a not-found error inline (e.g. another tenant's resident)", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Resident resident-1 was not found"));

    const result = await resendResidentInvitationAction("resident-1", idleResult);

    expect(result).toMatchObject({ status: "error", message: "Resident resident-1 was not found" });
  });
});

describe("setResidentActiveAction (ADR 0017)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("PATCHes the active flag, revalidates the residents list, and reports success", async () => {
    authedApiRequestMock.mockResolvedValue(undefined);

    const result = await setResidentActiveAction("resident-1", false, idleResult);

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/residents/resident-1/active",
      body: { active: false },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/staff/residents");
    expect(result).toMatchObject({
      status: "success",
      message: messages.feedback.residentDeactivated,
    });
  });

  it("surfaces a domain error inline instead of throwing", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Resident resident-1 was not found"));

    const result = await setResidentActiveAction("resident-1", false, idleResult);

    expect(result).toMatchObject({ status: "error", message: "Resident resident-1 was not found" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

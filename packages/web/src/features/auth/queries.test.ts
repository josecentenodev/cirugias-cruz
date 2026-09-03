import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));
vi.mock("@/lib/api-client.js", () => ({ apiRequest: apiRequestMock }));

const { confirmEmail } = await import("./queries.js");

describe("confirmEmail", () => {
  afterEach(() => vi.clearAllMocks());

  it("succeeds: calls POST /email-confirmations and returns the confirmed physicianId", async () => {
    apiRequestMock.mockResolvedValue({ physicianId: "physician-1" });

    const result = await confirmEmail("token-abc");

    expect(apiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/email-confirmations",
      body: { token: "token-abc" },
    });
    expect(result).toEqual({ ok: true, physicianId: "physician-1" });
  });

  it("expectable error: an invalid/expired token surfaces inline, unchanged", async () => {
    apiRequestMock.mockRejectedValue(
      new ApiDomainError("This confirmation link is invalid or has expired"),
    );

    const result = await confirmEmail("stale-token");

    expect(result).toEqual({
      ok: false,
      error: "This confirmation link is invalid or has expired",
    });
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    apiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(confirmEmail("token-abc")).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

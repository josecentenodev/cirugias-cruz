import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors";

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

const { registerResidentAction } = await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

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
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls POST /residents through authedApiRequest and redirects to the list", async () => {
    authedApiRequestMock.mockResolvedValue({ residentId: "resident-1" });

    await expect(registerResidentAction({}, formData(validResidentFields()))).rejects.toThrow(
      "NEXT_REDIRECT:/residents",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/residents",
      body: validResidentFields(),
    });
  });

  it("rejects a missing required field before ever calling api", async () => {
    const result = await registerResidentAction({}, formData(validResidentFields({ email: "" })));

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("firstName is required"));

    const result = await registerResidentAction({}, formData(validResidentFields()));

    expect(result).toEqual({ error: "firstName is required" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      registerResidentAction({}, formData(validResidentFields())),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

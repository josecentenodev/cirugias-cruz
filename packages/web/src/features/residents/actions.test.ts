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

const { revalidatePathMock } = vi.hoisted(() => ({ revalidatePathMock: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const {
  registerResidentAction,
  viewResidentTemporaryPasswordAction,
  resetResidentPasswordAction,
  setResidentActiveAction,
} = await import("./actions.js");

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

  it("rejects a missing required field before ever calling api, preserving what was typed", async () => {
    const result = await registerResidentAction({}, formData(validResidentFields({ email: "" })));

    expect(result).toEqual({
      error: "Please fill in every required field.",
      values: validResidentFields({ email: "" }),
    });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged, preserving what was typed", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("firstName is required"));

    const result = await registerResidentAction({}, formData(validResidentFields()));

    expect(result).toEqual({
      error: "firstName is required",
      values: validResidentFields(),
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      registerResidentAction({}, formData(validResidentFields())),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

describe("viewResidentTemporaryPasswordAction (ADR 0017)", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the temporary password while it hasn't been changed", async () => {
    authedApiRequestMock.mockResolvedValue({ temporaryPassword: "Temp1234" });

    const result = await viewResidentTemporaryPasswordAction("resident-1", {});

    expect(result).toEqual({ temporaryPassword: "Temp1234", revealed: true });
    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/residents/resident-1/temporary-password",
    });
  });

  it("returns null once the resident has changed it", async () => {
    authedApiRequestMock.mockResolvedValue({ temporaryPassword: null });

    const result = await viewResidentTemporaryPasswordAction("resident-1", {});

    expect(result).toEqual({ temporaryPassword: null, revealed: true });
  });

  it("surfaces a not-found error inline (e.g. another tenant's resident)", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Resident resident-1 was not found"));

    const result = await viewResidentTemporaryPasswordAction("resident-1", {});

    expect(result).toEqual({ error: "Resident resident-1 was not found" });
  });
});

describe("resetResidentPasswordAction (ADR 0017 blanqueo)", () => {
  afterEach(() => vi.clearAllMocks());

  it("issues a fresh temporary password", async () => {
    authedApiRequestMock.mockResolvedValue({ temporaryPassword: "NewTemp99" });

    const result = await resetResidentPasswordAction("resident-1", {});

    expect(result).toEqual({ temporaryPassword: "NewTemp99" });
    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/residents/resident-1/password-reset",
    });
  });
});

describe("setResidentActiveAction (ADR 0017)", () => {
  afterEach(() => vi.clearAllMocks());

  it("PATCHes the active flag, revalidates the residents list, and reports success", async () => {
    authedApiRequestMock.mockResolvedValue(undefined);

    const result = await setResidentActiveAction("resident-1", false, {});

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/residents/resident-1/active",
      body: { active: false },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/residents");
    expect(result).toEqual({ succeededActive: false });
  });

  it("surfaces a domain error inline instead of throwing", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Resident resident-1 was not found"));

    const result = await setResidentActiveAction("resident-1", false, {});

    expect(result).toEqual({ error: "Resident resident-1 was not found" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

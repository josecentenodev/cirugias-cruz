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

const { registerProcedureTypeAction } = await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("registerProcedureTypeAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: calls POST /procedure-types through authedApiRequest and redirects to the list", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(registerProcedureTypeAction({}, formData({ name: "Pterigión" }))).rejects.toThrow(
      "NEXT_REDIRECT:/procedure-types",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types",
      body: { name: "Pterigión" },
    });
  });

  it("omits optional fields when left blank, rather than sending empty strings", async () => {
    authedApiRequestMock.mockResolvedValue({ procedureTypeId: "pt-1" });

    await expect(
      registerProcedureTypeAction(
        {},
        formData({ name: "Pterigión", description: "", technique: "" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/procedure-types");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/procedure-types",
      body: { name: "Pterigión" },
    });
  });

  it("rejects a missing name before ever calling api", async () => {
    const result = await registerProcedureTypeAction({}, formData({ name: "" }));

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("ProcedureType requires a name"));

    const result = await registerProcedureTypeAction({}, formData({ name: "Pterigión" }));

    expect(result).toEqual({ error: "ProcedureType requires a name" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught for the nearest error.tsx boundary", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      registerProcedureTypeAction({}, formData({ name: "Pterigión" })),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

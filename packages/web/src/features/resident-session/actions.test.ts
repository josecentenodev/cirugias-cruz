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

const { changeOwnPasswordAction, recordOwnControlAction, modifyOwnControlAction } =
  await import("./actions.js");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("changeOwnPasswordAction", () => {
  afterEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new FakeRedirectSignal(path);
    });
  });

  it("succeeds: PATCHes /me/password and redirects to the surgery panel", async () => {
    authedApiRequestMock.mockResolvedValue(undefined);

    await expect(
      changeOwnPasswordAction({}, formData({ newPassword: "MyNewPassword1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/me/password",
      body: { newPassword: "MyNewPassword1" },
    });
  });

  it("rejects a blank password before ever calling api", async () => {
    const result = await changeOwnPasswordAction({}, formData({ newPassword: "" }));

    expect(result).toEqual({ error: "Please enter a new password." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's message inline", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Password is required"));

    const result = await changeOwnPasswordAction({}, formData({ newPassword: "x" }));

    expect(result).toEqual({ error: "Password is required" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("recordOwnControlAction", () => {
  afterEach(() => vi.clearAllMocks());

  it("never sends an authorType field — the server forces the resident's own identity", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "s1", controlId: "c1" });

    await expect(
      recordOwnControlAction(
        "s1",
        {},
        formData({ observations: "obs", recordedAt: "2026-01-11T10:00" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries/s1");

    const call = authedApiRequestMock.mock.calls[0]?.[0] as {
      path: string;
      body: { observations: string };
    };
    expect(call.path).toBe("/surgeries/s1/controls");
    expect(call.body.observations).toBe("obs");
  });

  it("rejects a blank observations field before calling api", async () => {
    const result = await recordOwnControlAction(
      "s1",
      {},
      formData({ observations: "", recordedAt: "2026-01-11T10:00" }),
    );

    expect(result).toEqual({ error: "Please fill in every required field." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("unexpected error: propagates uncaught", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(
      recordOwnControlAction(
        "s1",
        {},
        formData({ observations: "obs", recordedAt: "2026-01-11T10:00" }),
      ),
    ).rejects.toBeInstanceOf(ApiUnexpectedError);
  });
});

describe("modifyOwnControlAction", () => {
  afterEach(() => vi.clearAllMocks());

  it("succeeds: PATCHes the control and redirects to the resident's own surgery page", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "s1", controlId: "c1" });

    await expect(
      modifyOwnControlAction(
        "s1",
        "c1",
        {},
        formData({ observations: "updated", recordedAt: "2026-01-11T10:00" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries/s1");
  });

  it("expectable error: surfaces the not-mine-to-edit rejection inline", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A resident may only modify a Control they themselves authored"),
    );

    const result = await modifyOwnControlAction(
      "s1",
      "c1",
      {},
      formData({ observations: "updated", recordedAt: "2026-01-11T10:00" }),
    );

    expect(result).toEqual({
      error: "A resident may only modify a Control they themselves authored",
    });
  });
});

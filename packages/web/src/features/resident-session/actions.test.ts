import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { messages } from "@/messages/en";
import { formData, redirectMock, resetNextActionMocks } from "@/test/next-action-mocks";
import { ApiDomainError, ApiUnexpectedError } from "@/lib/api-errors";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const { changeOwnPasswordAction, recordOwnControlAction, modifyOwnControlAction } =
  await import("./actions.js");

describe("changeOwnPasswordAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: PATCHes /me/password and redirects to the surgery panel", async () => {
    authedApiRequestMock.mockResolvedValue(undefined);

    await expect(
      changeOwnPasswordAction(idleResult, formData({ newPassword: "MyNewPassword1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/me/password",
      body: { newPassword: "MyNewPassword1" },
    });
  });

  it("rejects a blank password before ever calling api", async () => {
    const result = await changeOwnPasswordAction(idleResult, formData({ newPassword: "" }));

    expect(result).toMatchObject({ status: "error", message: "Please enter a new password." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's message inline", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("Password is required"));

    const result = await changeOwnPasswordAction(idleResult, formData({ newPassword: "x" }));

    expect(result).toMatchObject({ status: "error", message: "Password is required" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("recordOwnControlAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("never sends an authorType field — the server forces the resident's own identity", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "s1", controlId: "c1" });

    await expect(
      recordOwnControlAction(
        "s1",
        idleResult,
        formData({
          observations: "obs",
          recordedAt: "2026-01-11T10:00",
          definitionId: "def-general",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries/s1");

    const call = authedApiRequestMock.mock.calls[0]?.[0] as {
      path: string;
      body: { observations: string };
    };
    expect(call.path).toBe("/surgeries/s1/controls");
    expect(call.body.observations).toBe("obs");
  });

  it("re-reads its own surgery and forwards coerced CONTROL-scoped CustomField values", async () => {
    authedApiRequestMock.mockImplementation(
      ({ method, path }: { method: string; path: string }) => {
        if (method === "GET" && path === "/me/surgeries/s1") {
          return Promise.resolve({
            id: "s1",
            controls: [],
            customFieldValues: [],
            customFields: [
              {
                id: "eva",
                name: "EVA",
                scope: "CONTROL",
                constraint: { valueType: "NUMBER", unit: "0-10" },
              },
            ],
          });
        }
        return Promise.resolve({ surgeryId: "s1", controlId: "c1" });
      },
    );

    await expect(
      recordOwnControlAction(
        "s1",
        idleResult,
        formData({
          observations: "obs",
          recordedAt: "2026-01-11T10:00",
          definitionId: "def-general",
          "customField:eva": "3",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/resident/surgeries/s1");

    const post = authedApiRequestMock.mock.calls.find(
      (call) => (call[0] as { method: string }).method === "POST",
    )?.[0] as { body: { customFieldValues: unknown } };
    expect(post.body.customFieldValues).toEqual([{ definitionId: "eva", value: 3 }]);
  });

  it("allows a blank observations field (A4/F-08) and omits it from the body", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "s1", controlId: "c1" });

    await expect(
      recordOwnControlAction(
        "s1",
        idleResult,
        formData({ observations: "", recordedAt: "2026-01-11T10:00", definitionId: "def-general" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    const body = (authedApiRequestMock.mock.calls[0]?.[0] as { body: Record<string, unknown> })
      .body;
    expect(body).not.toHaveProperty("observations");
  });

  it("unexpected error: is shown inline as the generic message — the form survives", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await recordOwnControlAction(
        "s1",
        idleResult,
        formData({
          observations: "obs",
          recordedAt: "2026-01-11T10:00",
          definitionId: "def-general",
        }),
      ),
    ).toMatchObject({
      status: "error",
      message: messages.errors.unexpected,
    });
  });
});

describe("modifyOwnControlAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNextActionMocks();
  });

  it("succeeds: PATCHes the control and redirects to the resident's own surgery page", async () => {
    authedApiRequestMock.mockResolvedValue({ surgeryId: "s1", controlId: "c1" });

    await expect(
      modifyOwnControlAction(
        "s1",
        "c1",
        idleResult,
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
      idleResult,
      formData({ observations: "updated", recordedAt: "2026-01-11T10:00" }),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "A resident may only modify a Control they themselves authored",
    });
  });
});

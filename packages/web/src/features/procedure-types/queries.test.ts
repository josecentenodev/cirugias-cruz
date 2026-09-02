import { afterEach, describe, expect, it, vi } from "vitest";

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const { listProcedureTypes } = await import("./queries.js");

describe("listProcedureTypes", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the physician's procedure types", async () => {
    authedApiRequestMock.mockResolvedValue([{ id: "pt1" }, { id: "pt2" }]);

    const result = await listProcedureTypes();

    expect(result).toEqual([{ id: "pt1" }, { id: "pt2" }]);
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/procedure-types" });
  });

  it("returns an empty array when the physician has no procedure types", async () => {
    authedApiRequestMock.mockResolvedValue([]);

    expect(await listProcedureTypes()).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const { listResidents } = await import("./queries.js");

describe("listResidents", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the physician's residents", async () => {
    authedApiRequestMock.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);

    const result = await listResidents();

    expect(result).toEqual([{ id: "r1" }, { id: "r2" }]);
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/residents" });
  });

  it("returns an empty array when the physician has no residents", async () => {
    authedApiRequestMock.mockResolvedValue([]);

    expect(await listResidents()).toEqual([]);
  });
});

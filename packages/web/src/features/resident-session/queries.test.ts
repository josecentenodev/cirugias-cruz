import { afterEach, describe, expect, it, vi } from "vitest";

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const { listOwnSurgeries, getOwnSurgery, getOwnResidentId } = await import("./queries.js");

describe("listOwnSurgeries", () => {
  afterEach(() => vi.clearAllMocks());

  it("hits /me/surgeries, not /surgeries", async () => {
    authedApiRequestMock.mockResolvedValue([{ id: "s1" }]);

    const result = await listOwnSurgeries();

    expect(result).toEqual([{ id: "s1" }]);
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/me/surgeries" });
  });
});

describe("getOwnSurgery", () => {
  afterEach(() => vi.clearAllMocks());

  it("hits /me/surgeries/:id", async () => {
    authedApiRequestMock.mockResolvedValue({ id: "s1" });

    const result = await getOwnSurgery("s1");

    expect(result).toEqual({ id: "s1" });
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/me/surgeries/s1" });
  });
});

describe("getOwnResidentId", () => {
  afterEach(() => vi.clearAllMocks());

  it("unwraps { residentId } from GET /me", async () => {
    authedApiRequestMock.mockResolvedValue({ residentId: "resident-1" });

    const result = await getOwnResidentId();

    expect(result).toBe("resident-1");
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/me" });
  });
});

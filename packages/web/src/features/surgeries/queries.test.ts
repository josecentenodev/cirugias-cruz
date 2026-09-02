import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors";

const { notFoundMock } = vi.hoisted(() => ({ notFoundMock: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

class FakeNotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}
notFoundMock.mockImplementation(() => {
  throw new FakeNotFoundSignal();
});

const { getSurgery, listSurgeries } = await import("./queries.js");

describe("listSurgeries", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the physician's surgeries", async () => {
    authedApiRequestMock.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);

    const result = await listSurgeries();

    expect(result).toEqual([{ id: "s1" }, { id: "s2" }]);
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/surgeries" });
  });

  it("returns an empty array when the physician has no surgeries", async () => {
    authedApiRequestMock.mockResolvedValue([]);

    expect(await listSurgeries()).toEqual([]);
  });
});

describe("getSurgery", () => {
  afterEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new FakeNotFoundSignal();
    });
  });

  it("returns the surgery, aggregate included (controls, participating residents)", async () => {
    authedApiRequestMock.mockResolvedValue({
      id: "s1",
      controls: [{ id: "c1" }],
      participatingResidentIds: ["r1"],
    });

    const result = await getSurgery("s1");

    expect(result).toEqual({
      id: "s1",
      controls: [{ id: "c1" }],
      participatingResidentIds: ["r1"],
    });
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/surgeries/s1" });
  });

  it("calls Next's notFound() for a surgery that does not exist (or belongs to another tenant)", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiNotFoundError("Surgery s1 was not found"));

    await expect(getSurgery("s1")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets an unexpected error propagate uncaught for error.tsx to handle", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(getSurgery("s1")).rejects.toBeInstanceOf(ApiUnexpectedError);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

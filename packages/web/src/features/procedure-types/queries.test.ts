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

const { getProcedureType, listProcedureTypes } = await import("./queries.js");

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

describe("getProcedureType", () => {
  afterEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new FakeNotFoundSignal();
    });
  });

  it("returns the procedure type, CustomField definitions included", async () => {
    authedApiRequestMock.mockResolvedValue({
      id: "pt1",
      customFields: [{ id: "cf1" }],
    });

    const result = await getProcedureType("pt1");

    expect(result).toEqual({ id: "pt1", customFields: [{ id: "cf1" }] });
    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/procedure-types/pt1",
    });
  });

  it("calls Next's notFound() for a procedure type that does not exist (or belongs to another tenant)", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiNotFoundError("Procedure type pt1 was not found"),
    );

    await expect(getProcedureType("pt1")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets an unexpected error propagate uncaught for error.tsx to handle", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(getProcedureType("pt1")).rejects.toBeInstanceOf(ApiUnexpectedError);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

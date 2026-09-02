import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors.js";

const { notFoundMock } = vi.hoisted(() => ({ notFoundMock: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request.js", () => ({ authedApiRequest: authedApiRequestMock }));

class FakeNotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}
notFoundMock.mockImplementation(() => {
  throw new FakeNotFoundSignal();
});

const { getPatient, listPatients } = await import("./queries.js");

describe("listPatients", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the physician's patients", async () => {
    authedApiRequestMock.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);

    const result = await listPatients();

    expect(result).toEqual([{ id: "p1" }, { id: "p2" }]);
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/patients" });
  });

  it("returns an empty array when the physician has no patients", async () => {
    authedApiRequestMock.mockResolvedValue([]);

    expect(await listPatients()).toEqual([]);
  });
});

describe("getPatient", () => {
  afterEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new FakeNotFoundSignal();
    });
  });

  it("returns the patient when found", async () => {
    authedApiRequestMock.mockResolvedValue({ id: "p1", firstName: "Ana" });

    const result = await getPatient("p1");

    expect(result).toEqual({ id: "p1", firstName: "Ana" });
    expect(authedApiRequestMock).toHaveBeenCalledWith({ method: "GET", path: "/patients/p1" });
  });

  it("calls Next's notFound() for a patient that does not exist (or belongs to another tenant)", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiNotFoundError("Patient p1 was not found"));

    await expect(getPatient("p1")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets an unexpected error propagate uncaught for error.tsx to handle", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(getPatient("p1")).rejects.toBeInstanceOf(ApiUnexpectedError);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

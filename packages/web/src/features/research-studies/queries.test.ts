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

const { getResearchStudy, listResearchStudies } = await import("./queries.js");

describe("listResearchStudies", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns the physician's research studies, unwrapped from api's { researchStudies } envelope", async () => {
    authedApiRequestMock.mockResolvedValue({
      researchStudies: [{ id: "rs1" }, { id: "rs2" }],
    });

    const result = await listResearchStudies();

    expect(result).toEqual([{ id: "rs1" }, { id: "rs2" }]);
    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/research-studies",
    });
  });

  it("returns an empty array when the physician has no research studies", async () => {
    authedApiRequestMock.mockResolvedValue({ researchStudies: [] });

    expect(await listResearchStudies()).toEqual([]);
  });
});

describe("getResearchStudy", () => {
  afterEach(() => {
    vi.clearAllMocks();
    notFoundMock.mockImplementation(() => {
      throw new FakeNotFoundSignal();
    });
  });

  it("returns the research study, surgery universe included", async () => {
    authedApiRequestMock.mockResolvedValue({
      id: "rs1",
      status: "DRAFT",
      surgeryIds: ["s1"],
    });

    const result = await getResearchStudy("rs1");

    expect(result).toEqual({ id: "rs1", status: "DRAFT", surgeryIds: ["s1"] });
    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/research-studies/rs1",
    });
  });

  it("calls Next's notFound() for a study that does not exist (or belongs to another tenant)", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiNotFoundError("Research study rs1 was not found"),
    );

    await expect(getResearchStudy("rs1")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets an unexpected error propagate uncaught for error.tsx to handle", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    await expect(getResearchStudy("rs1")).rejects.toBeInstanceOf(ApiUnexpectedError);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { idleResult } from "@/lib/action-result";
import { messages } from "@/messages/en";
import { formData, redirectMock, resetNextActionMocks } from "@/test/next-action-mocks";
import { ApiDomainError, ApiNotFoundError, ApiUnexpectedError } from "@/lib/api-errors";

vi.mock("next/navigation", async () => (await import("@/test/next-action-mocks")).navigationModule);
vi.mock("next/headers", async () => (await import("@/test/next-action-mocks")).headersModule);

const { authedApiRequestMock } = vi.hoisted(() => ({ authedApiRequestMock: vi.fn() }));
vi.mock("@/lib/authed-api-request", () => ({ authedApiRequest: authedApiRequestMock }));

const {
  addSurgeryToStudyAction,
  changeResearchStudyStatusAction,
  createResearchStudyAction,
  deleteResearchStudyAction,
  removeSurgeryFromStudyAction,
  updateResearchStudyAction,
} = await import("./actions.js");

function textFields(overrides: Record<string, string> = {}) {
  return {
    hypothesis: "",
    results: "",
    analysis: "",
    conclusion: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetNextActionMocks();
});

describe("createResearchStudyAction", () => {
  it("succeeds: calls POST /research-studies through authedApiRequest and redirects to the new study", async () => {
    authedApiRequestMock.mockResolvedValue({ researchStudyId: "rs1" });

    await expect(
      createResearchStudyAction(idleResult, formData(textFields({ hypothesis: "A hypothesis" }))),
    ).rejects.toThrow("NEXT_REDIRECT:/research-studies/rs1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/research-studies",
      body: textFields({ hypothesis: "A hypothesis" }),
    });
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiDomainError("something invalid"));

    const result = await createResearchStudyAction(idleResult, formData(textFields()));

    expect(result).toMatchObject({ status: "error", message: "something invalid" });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("updateResearchStudyAction", () => {
  it("succeeds: calls PATCH /research-studies/:id and redirects back to the detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ id: "rs1" });

    await expect(
      updateResearchStudyAction(
        "rs1",
        idleResult,
        formData(textFields({ results: "New results" })),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/research-studies/rs1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/research-studies/rs1",
      body: textFields({ results: "New results" }),
    });
  });

  it("expectable error: a completed study's rejection surfaces inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A completed research study cannot be modified"),
    );

    const result = await updateResearchStudyAction("rs1", idleResult, formData(textFields()));

    expect(result).toMatchObject({
      status: "error",
      message: "A completed research study cannot be modified",
    });
  });

  it("unexpected error: is shown inline as the generic message — the form survives", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiUnexpectedError());

    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await updateResearchStudyAction("rs1", idleResult, formData(textFields())),
    ).toMatchObject({
      status: "error",
      message: messages.errors.unexpected,
    });
  });
});

describe("addSurgeryToStudyAction", () => {
  it("succeeds: calls POST /research-studies/:id/surgeries and redirects back to the detail page", async () => {
    authedApiRequestMock.mockResolvedValue({ researchStudyId: "rs1", surgeryIds: ["s1"] });

    await expect(
      addSurgeryToStudyAction("rs1", idleResult, formData({ surgeryId: "s1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/research-studies/rs1");

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/research-studies/rs1/surgeries",
      body: { surgeryId: "s1" },
    });
  });

  it("rejects an empty selection before ever calling api", async () => {
    const result = await addSurgeryToStudyAction("rs1", idleResult, formData({ surgeryId: "" }));

    expect(result).toMatchObject({ status: "error", message: "Please select a surgery." });
    expect(authedApiRequestMock).not.toHaveBeenCalled();
  });

  it("expectable error: surfaces api's NotFoundError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(new ApiNotFoundError("Surgery s1 was not found"));

    const result = await addSurgeryToStudyAction("rs1", idleResult, formData({ surgeryId: "s1" }));

    expect(result).toMatchObject({ status: "error", message: "Surgery s1 was not found" });
  });
});

describe("removeSurgeryFromStudyAction", () => {
  it("succeeds: calls DELETE /research-studies/:id/surgeries/:surgeryId and redirects back", async () => {
    authedApiRequestMock.mockResolvedValue({ researchStudyId: "rs1", surgeryIds: [] });

    await expect(removeSurgeryFromStudyAction("rs1", "s1", idleResult)).rejects.toThrow(
      "NEXT_REDIRECT:/research-studies/rs1",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/research-studies/rs1/surgeries/s1",
    });
  });

  it("expectable error: surfaces api's DomainError message inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A completed research study cannot be modified"),
    );

    const result = await removeSurgeryFromStudyAction("rs1", "s1", idleResult);

    expect(result).toMatchObject({
      status: "error",
      message: "A completed research study cannot be modified",
    });
  });
});

describe("changeResearchStudyStatusAction", () => {
  it("succeeds: calls POST /research-studies/:id/status with the bound target and redirects back", async () => {
    authedApiRequestMock.mockResolvedValue({ researchStudyId: "rs1", status: "IN_PROGRESS" });

    await expect(changeResearchStudyStatusAction("rs1", "IN_PROGRESS", idleResult)).rejects.toThrow(
      "NEXT_REDIRECT:/research-studies/rs1",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "POST",
      path: "/research-studies/rs1/status",
      body: { to: "IN_PROGRESS" },
    });
  });

  it("expectable error: surfaces api's illegal-transition rejection inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("Only a DRAFT research study can move to IN_PROGRESS"),
    );

    const result = await changeResearchStudyStatusAction("rs1", "IN_PROGRESS", idleResult);

    expect(result).toMatchObject({
      status: "error",
      message: "Only a DRAFT research study can move to IN_PROGRESS",
    });
  });
});

describe("deleteResearchStudyAction", () => {
  it("succeeds: calls DELETE /research-studies/:id and redirects to the list", async () => {
    authedApiRequestMock.mockResolvedValue({ researchStudyId: "rs1" });

    await expect(deleteResearchStudyAction("rs1", idleResult)).rejects.toThrow(
      "NEXT_REDIRECT:/research-studies",
    );

    expect(authedApiRequestMock).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/research-studies/rs1",
    });
  });

  it("expectable error: a non-DRAFT study's rejection surfaces inline, unchanged", async () => {
    authedApiRequestMock.mockRejectedValue(
      new ApiDomainError("A research study may only be deleted while in DRAFT"),
    );

    const result = await deleteResearchStudyAction("rs1", idleResult);

    expect(result).toMatchObject({
      status: "error",
      message: "A research study may only be deleted while in DRAFT",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

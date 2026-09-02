import { describe, expect, it } from "vitest";
import { toResearchStudyDetailView, toResearchStudyListView } from "./mappers.js";
import type { ResearchStudyDto } from "./dtos.js";

function buildStudy(overrides: Partial<ResearchStudyDto> = {}): ResearchStudyDto {
  return {
    id: "study-1",
    status: "DRAFT",
    surgeryIds: [],
    ...overrides,
  };
}

describe("toResearchStudyListView", () => {
  it("labels each status for display", () => {
    expect(toResearchStudyListView(buildStudy({ status: "DRAFT" })).statusLabel).toBe("Draft");
    expect(toResearchStudyListView(buildStudy({ status: "IN_PROGRESS" })).statusLabel).toBe(
      "In progress",
    );
    expect(toResearchStudyListView(buildStudy({ status: "COMPLETED" })).statusLabel).toBe(
      "Completed",
    );
  });

  it("falls back to a placeholder when no hypothesis was recorded yet", () => {
    const view = toResearchStudyListView(buildStudy({ hypothesis: undefined }));
    expect(view.hypothesisPreview).toBe("No hypothesis recorded yet.");
  });

  it("shows the hypothesis verbatim when short", () => {
    const view = toResearchStudyListView(buildStudy({ hypothesis: "Short hypothesis" }));
    expect(view.hypothesisPreview).toBe("Short hypothesis");
  });

  it("truncates a long hypothesis for the list preview", () => {
    const long = "a".repeat(200);
    const view = toResearchStudyListView(buildStudy({ hypothesis: long }));
    expect(view.hypothesisPreview).toBe(`${"a".repeat(120)}…`);
  });

  it("counts surgeries without needing them resolved to names", () => {
    const view = toResearchStudyListView(buildStudy({ surgeryIds: ["s1", "s2"] }));
    expect(view.surgeryCount).toBe(2);
  });
});

describe("toResearchStudyDetailView", () => {
  it("defaults every unset text field to an empty string, never undefined", () => {
    const view = toResearchStudyDetailView(buildStudy(), new Map());
    expect(view).toMatchObject({
      hypothesis: "",
      results: "",
      analysis: "",
      conclusion: "",
    });
  });

  it("resolves each surgery id to its label from the lookup map", () => {
    const surgeryLabels = new Map([["s1", "Juan Pérez — Pterigión (Jan 15, 2026)"]]);
    const view = toResearchStudyDetailView(buildStudy({ surgeryIds: ["s1"] }), surgeryLabels);

    expect(view.surgeries).toEqual([{ id: "s1", label: "Juan Pérez — Pterigión (Jan 15, 2026)" }]);
  });

  it("falls back to a placeholder when a surgery id has no matching entry", () => {
    const view = toResearchStudyDetailView(buildStudy({ surgeryIds: ["s1"] }), new Map());
    expect(view.surgeries).toEqual([{ id: "s1", label: "Unknown surgery" }]);
  });
});

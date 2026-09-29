import { describe, expect, it } from "vitest";
import { isFeedbackKey, readFlashKey } from "./flash.js";

describe("readFlashKey", () => {
  it("reads a known key among other cookies", () => {
    expect(readFlashKey("web_session=abc; flash=patientRegistered; other=1")).toBe(
      "patientRegistered",
    );
  });

  it("returns undefined when there is no flash cookie", () => {
    expect(readFlashKey("web_session=abc")).toBeUndefined();
    expect(readFlashKey("")).toBeUndefined();
  });

  it("discards anything that isn't a known feedback key — a tampered cookie never renders", () => {
    expect(readFlashKey("flash=<img src=x onerror=alert(1)>")).toBeUndefined();
    expect(readFlashKey("flash=Ana%20Garc%C3%ADa")).toBeUndefined();
    expect(readFlashKey("flash=__proto__")).toBeUndefined();
  });

  it("does not accept the section's non-message entries as keys", () => {
    expect(isFeedbackKey("notifications")).toBe(false);
    expect(isFeedbackKey("dismiss")).toBe(false);
  });
});

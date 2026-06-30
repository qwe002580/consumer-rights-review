import { describe, expect, it } from "vitest";
import { generateAssessmentNumber } from "../lib/assessment-number";

describe("generateAssessmentNumber", () => {
  it("formats the injected date and random value", () => {
    expect(generateAssessmentNumber(new Date("2026-06-29T01:00:00Z"), () => 0.0081)).toBe(
      "11399-20260629-0081"
    );
  });

  it("uses the Asia/Shanghai calendar date", () => {
    expect(generateAssessmentNumber(new Date("2026-06-28T16:00:00Z"), () => 0)).toBe(
      "11399-20260629-0000"
    );
  });
});

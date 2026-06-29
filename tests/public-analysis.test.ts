import { describe, expect, it } from "vitest";
import { toPublicAnalysis } from "../lib/public-analysis";
import type { AnalysisOutput } from "../lib/schema";

const internalAnalysis: AnalysisOutput = {
  summary: "本案需要围绕付款与承诺差异进一步核对。",
  opportunity: "medium_high",
  evidence_completeness: "partial",
  favorable_factors: ["付款事实明确", "沟通记录已保存"],
  adverse_factors: ["风险1", "风险2", "风险3"],
  decisive_issues: ["风险4", "风险5"],
  materials: ["材料1", "材料2", "材料3", "材料4", "材料5"],
  strategy_direction: "INTERNAL_STRATEGY",
  review_flag: "contact_soon"
};

describe("public analysis boundary", () => {
  it("returns the exact diagnosis-only whitelist with bounded lists", () => {
    const result = toPublicAnalysis(internalAnalysis);
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      summary: internalAnalysis.summary,
      opportunity: "medium_high",
      evidenceCompleteness: "partial",
      riskPoints: ["风险1", "风险2", "风险3", "风险4"],
      materialGaps: ["材料1", "材料2", "材料3", "材料4"],
      manualReviewRecommended: true,
      review_flag: "contact_soon"
    });
    expect(Object.keys(result).sort()).toEqual([
      "evidenceCompleteness",
      "manualReviewRecommended",
      "materialGaps",
      "opportunity",
      "review_flag",
      "riskPoints",
      "summary"
    ].sort());
    for (const prohibited of [
      "probability", "first_step", "stages", "strategy", "steps",
      "communication", "favorable_factors"
    ]) {
      expect(result).not.toHaveProperty(prohibited);
    }
    expect(serialized).not.toContain("INTERNAL_STRATEGY");
  });
});

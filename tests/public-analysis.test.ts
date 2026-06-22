import { describe, expect, it } from "vitest";
import { toPublicAnalysis } from "../lib/public-analysis";
import type { AnalysisOutput } from "../lib/schema";

const internalAnalysis: AnalysisOutput = {
  summary: "本案需要围绕付款与承诺差异进一步核对。",
  favorable_factors: ["付款事实明确", "沟通记录已保存"],
  adverse_factors: ["关键宣传页面缺失"],
  decisive_issues: ["能否证明明确退款承诺"],
  strategy: "INTERNAL_STRATEGY",
  next_steps: ["先整理付款和聊天记录", "PRIVATE_STEP", "继续内部处理"],
  public_stage_titles: ["核对合同和承诺材料", "评估后续处理路径"],
  materials: ["合同", "宣传截图"],
  communication: "FULL_SCRIPT",
  review_flag: "contact_soon",
  probability: {
    full_success: { min: 30, max: 45 },
    substantive_result: { min: 55, max: 70 },
    confidence: "moderate",
    factors: ["付款事实明确"]
  }
};

describe("public analysis boundary", () => {
  it("returns only allowlisted customer-facing fields", () => {
    const result = toPublicAnalysis(internalAnalysis);
    const serialized = JSON.stringify(result);

    expect(result.first_step).toBe(internalAnalysis.next_steps[0]);
    expect(result.later_stage_titles).toEqual(internalAnalysis.public_stage_titles);
    expect(serialized).not.toContain("INTERNAL_STRATEGY");
    expect(serialized).not.toContain("FULL_SCRIPT");
    expect(serialized).not.toContain("PRIVATE_STEP");
    expect(Object.keys(result).sort()).toEqual(
      [
        "adverse_factors",
        "favorable_factors",
        "first_step",
        "later_stage_titles",
        "materials",
        "probability",
        "review_flag",
        "summary"
      ].sort()
    );
  });
});

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

  it("replaces unsafe prose inside allowlisted fields with diagnostic fallbacks", () => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      summary: "成功率95%，保证全额退款。",
      adverse_factors: ["第一步拨打12315并复制以下投诉模板", "合同条款仍需核验"],
      decisive_issues: ["起诉状模板如下：原告应当……"],
      materials: ["点击平台入口后按步骤提交", "付款记录"]
    });
    const serialized = JSON.stringify(result);

    expect(result.summary).toBe("当前信息需要进一步核验后形成诊断结论。");
    expect(result.riskPoints).toEqual([
      "该风险点包含非诊断内容，需要人工复核。",
      "合同条款仍需核验",
      "该风险点包含非诊断内容，需要人工复核。"
    ]);
    expect(result.materialGaps).toEqual([
      "该材料项包含非诊断内容，需要人工复核。",
      "付款记录"
    ]);
    expect(serialized).not.toMatch(/95%|保证|12315|投诉模板|起诉状模板|平台入口/);
  });

  it("recommends manual review when unsafe model prose is removed", () => {
    const result = toPublicAnalysis({
      ...internalAnalysis,
      summary: "保证退款成功",
      review_flag: "self_service"
    });

    expect(result.manualReviewRecommended).toBe(true);
  });
});

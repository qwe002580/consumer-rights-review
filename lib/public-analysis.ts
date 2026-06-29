import type { AnalysisOutput, PublicAnalysis } from "./schema";

const prohibitedPublicContent =
  /(?:\d+(?:\.\d+)?\s*[%％]|百分之|成功率|概率|保证|包退|必(?:然|定)|模板|话术|第[一二三四五六七八九十\d]+步|详细步骤|操作步骤|流程|平台入口|点击|拨打|12315|起诉状|诉状|投诉|诉讼)/i;

function sanitizePublicText(value: string, fallback: string) {
  return prohibitedPublicContent.test(value) ? fallback : value;
}

export function toPublicAnalysis(analysis: AnalysisOutput): PublicAnalysis {
  const publicText = [
    analysis.summary,
    ...analysis.adverse_factors,
    ...analysis.decisive_issues,
    ...analysis.materials
  ];
  const removedUnsafeContent = publicText.some((item) => prohibitedPublicContent.test(item));

  return {
    summary: sanitizePublicText(
      analysis.summary,
      "当前信息需要进一步核验后形成诊断结论。"
    ),
    opportunity: analysis.opportunity,
    evidenceCompleteness: analysis.evidence_completeness,
    riskPoints: [...analysis.adverse_factors, ...analysis.decisive_issues]
      .slice(0, 4)
      .map((item) =>
        sanitizePublicText(item, "该风险点包含非诊断内容，需要人工复核。")
      ),
    materialGaps: analysis.materials
      .slice(0, 4)
      .map((item) =>
        sanitizePublicText(item, "该材料项包含非诊断内容，需要人工复核。")
      ),
    manualReviewRecommended:
      removedUnsafeContent ||
      analysis.review_flag !== "self_service" ||
      analysis.evidence_completeness === "review_needed",
    review_flag: analysis.review_flag
  };
}

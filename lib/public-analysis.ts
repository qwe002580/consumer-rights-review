import type { AnalysisOutput, PublicAnalysis } from "./schema";

const prohibitedPublicPatterns = [
  /\d+(?:\.\d+)?%/,
  /百分(?:之)?[零〇一二三四五六七八九十百千万两\d]+/,
  /(?:胜诉|退款|成功|达成诉求)率(?:\d+(?:\.\d+)?%?|[零〇一二三四五六七八九十百两]+成?)/,
  /(?:保证|确保|承诺)(?:一定|必定|肯定|可以|能够|全额|成功)+(?:退款|胜诉|成功|达成)/,
  /(?:保证|确保)(?:退款|胜诉)(?:成功|无疑)/,
  /(?:一定|必定|肯定|百分百|包)(?:可以|能够)?(?:退款|胜诉|成功)/,
  /(?:照|按|复制|套用|使用).{0,12}(?:模板|话术)/,
  /(?:投诉|起诉状?|诉讼|沟通).{0,8}(?:模板|话术)/,
  /(?:模板|话术).{0,8}(?:投诉|起诉|诉讼|沟通|回复|发送)/,
  /第[零〇一二三四五六七八九十百两\d]+步.{0,12}(?:点击|进入|拨打|提交|复制|发送)/,
  /(?:点击|进入).{0,8}(?:平台)?入口/,
  /拨打(?:12315|消费者投诉举报专线)/,
  /(?:详细|完整|具体)(?:投诉|诉讼|起诉)?(?:步骤|流程)/,
  /按(?:照)?.{0,8}(?:步骤|流程).{0,8}(?:提交|操作|投诉|起诉)/
];

function normalizeForSafetyCheck(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]+/g, "")
    .toLowerCase();
}

function containsProhibitedPublicContent(value: string) {
  const normalized = normalizeForSafetyCheck(value);
  return prohibitedPublicPatterns.some((pattern) => pattern.test(normalized));
}

function sanitizePublicText(value: string, fallback: string) {
  return containsProhibitedPublicContent(value) ? fallback : value;
}

export function toPublicAnalysis(analysis: AnalysisOutput): PublicAnalysis {
  const publicText = [
    analysis.summary,
    ...analysis.adverse_factors,
    ...analysis.decisive_issues,
    ...analysis.materials
  ];
  const removedUnsafeContent = publicText.some(containsProhibitedPublicContent);

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

import type { AnalysisOutput, PublicAnalysis } from "./schema";

export function toPublicAnalysis(analysis: AnalysisOutput): PublicAnalysis {
  return {
    summary: analysis.summary,
    opportunity: analysis.opportunity,
    evidenceCompleteness: analysis.evidence_completeness,
    riskPoints: [...analysis.adverse_factors, ...analysis.decisive_issues].slice(0, 4),
    materialGaps: analysis.materials.slice(0, 4),
    manualReviewRecommended:
      analysis.review_flag !== "self_service" ||
      analysis.evidence_completeness === "review_needed",
    review_flag: analysis.review_flag
  };
}

import type { AnalysisOutput, PublicAnalysis } from "./schema";

export function toPublicAnalysis(analysis: AnalysisOutput): PublicAnalysis {
  return {
    summary: analysis.summary,
    favorable_factors: analysis.favorable_factors.slice(0, 3),
    adverse_factors: analysis.adverse_factors.slice(0, 3),
    first_step: analysis.next_steps[0],
    later_stage_titles: analysis.public_stage_titles,
    materials: analysis.materials.slice(0, 5),
    probability: analysis.probability,
    review_flag: analysis.review_flag
  };
}

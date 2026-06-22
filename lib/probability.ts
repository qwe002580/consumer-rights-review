import type { IntakeInput, ProbabilityAssessment } from "./schema";

type ModelFactorCounts = {
  favorableCount: number;
  adverseCount: number;
  decisiveIssueCount: number;
};

const evidenceWeights: Record<string, [number, number]> = {
  payment: [7, 6],
  contract: [8, 7],
  chat: [7, 6],
  promo: [6, 5],
  invoice: [4, 3],
  recording: [4, 3]
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function makeRange(center: number, width: number) {
  const min = clamp(center - Math.ceil(width / 2), 0, 94);
  const max = clamp(Math.max(min + 6, center + Math.floor(width / 2)), 6, 95);
  return { min, max };
}

export function calculateProbabilityAssessment(
  intake: IntakeInput,
  model: ModelFactorCounts
): ProbabilityAssessment {
  let substantive = 38;
  let full = 24;
  const factors: string[] = [];
  const evidence = new Set(intake.evidence);
  const obstacles = new Set(intake.obstacles.map((value) => value.toLowerCase()));

  for (const [item, [substantiveWeight, fullWeight]] of Object.entries(evidenceWeights)) {
    if (evidence.has(item)) {
      substantive += substantiveWeight;
      full += fullWeight;
    }
  }

  if (evidence.size >= 4) factors.push("现有核心材料相对完整");
  if (intake.issues.includes("nonperformance")) {
    substantive += 5;
    full += 3;
    factors.push("存在服务未履行事实");
  }
  if (intake.issues.includes("misrepresentation")) {
    substantive += 4;
    full += 3;
    factors.push("存在宣传或承诺争议");
  }
  if (intake.paymentMethod === "installment") {
    substantive -= 4;
    full -= 7;
    factors.push("涉及分期或贷款安排");
  }
  if (intake.stage === "deadlock") {
    substantive -= 8;
    full -= 10;
    factors.push("多轮沟通后仍无进展");
  }
  if (obstacles.has("missing_evidence") || obstacles.has("missingevidence")) {
    substantive -= 10;
    full -= 12;
    factors.push("关键材料仍不完整");
  }
  if (obstacles.has("platform_rejected") || obstacles.has("platformrejected")) {
    substantive -= 8;
    full -= 10;
    factors.push("平台处理已受阻");
  }
  if (obstacles.has("merchant_offline") || obstacles.has("merchantoffline")) {
    substantive -= 8;
    full -= 10;
    factors.push("商家存在失联风险");
  }
  if (intake.amount >= 10000) {
    substantive -= 2;
    full -= 4;
    factors.push("争议金额较高");
  }

  const favorable = Math.min(3, Math.max(0, model.favorableCount));
  const adverse = Math.min(3, Math.max(0, model.adverseCount));
  const decisive = Math.min(3, Math.max(0, model.decisiveIssueCount));
  substantive += favorable * 2 - adverse * 2 - decisive;
  full += favorable * 2 - adverse * 2 - decisive;

  const missingKeyEvidence =
    evidence.size < 2 ||
    obstacles.has("missing_evidence") ||
    obstacles.has("missingevidence");
  const width = missingKeyEvidence ? 24 : evidence.size >= 4 ? 12 : 18;
  const substantiveRange = makeRange(substantive, width);
  const fullRange = makeRange(Math.min(full, substantive - 8), width);

  return {
    full_success: {
      min: Math.min(fullRange.min, substantiveRange.min),
      max: Math.min(fullRange.max, substantiveRange.max)
    },
    substantive_result: substantiveRange,
    confidence: missingKeyEvidence
      ? "limited"
      : evidence.size >= 4
        ? "strong"
        : "moderate",
    factors: factors.slice(0, 5)
  };
}

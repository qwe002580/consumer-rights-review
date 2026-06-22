import OpenAI from "openai";
import {
  getGoalLabel,
  getScenarioLabel,
  getStageLabel,
  modelAnalysisSchema,
  type AnalysisOutput,
  type IntakeInput,
  type ModelAnalysis
} from "./schema";
import { calculateProbabilityAssessment } from "./probability";
import { buildAnalysisPrompt } from "./prompt";

function extractJsonObject(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  return typeof value === "string" && value.trim() ? [value] : [];
}

function normalizeAnalysisShape(raw: unknown) {
  if (!raw || typeof raw !== "object") return raw;

  const candidate = raw as Record<string, unknown>;
  const favorable = toStringArray(
    candidate.favorable_factors ?? candidate.basis ?? candidate.advantages
  );
  const adverse = toStringArray(
    candidate.adverse_factors ?? candidate.risks ?? candidate.risk_points
  );
  const steps = toStringArray(candidate.next_steps ?? candidate.nextSteps);
  const reviewFlagValue =
    typeof candidate.review_flag === "boolean"
      ? candidate.review_flag
        ? "manual_review"
        : "self_service"
      : typeof candidate.reviewFlag === "boolean"
        ? candidate.reviewFlag
          ? "manual_review"
          : "self_service"
        : candidate.review_flag ?? candidate.reviewFlag;

  return {
    summary: candidate.summary,
    favorable_factors: favorable.length ? favorable : ["现有交易信息可供进一步核对"],
    adverse_factors: adverse.length ? adverse : ["现有信息仍需结合完整材料复核"],
    decisive_issues: toStringArray(candidate.decisive_issues).length
      ? toStringArray(candidate.decisive_issues)
      : ["关键承诺与实际履行差异能否由材料对应证明"],
    strategy:
      candidate.strategy ??
      "先固定交易事实和关键承诺，再根据材料完整度确定后续处理路径。",
    next_steps:
      steps.length >= 2
        ? steps
        : [...steps, "核对关键材料后形成后续处理方案"],
    public_stage_titles: toStringArray(candidate.public_stage_titles).length
      ? toStringArray(candidate.public_stage_titles).slice(0, 4)
      : ["核对关键材料", "评估后续处理路径"],
    materials: toStringArray(candidate.materials ?? candidate.supporting_materials),
    communication: Array.isArray(candidate.communication)
      ? candidate.communication.join("\n")
      : Array.isArray(candidate.communication_suggestion)
        ? candidate.communication_suggestion.join("\n")
        : candidate.communication ?? candidate.communication_suggestion,
    review_flag: reviewFlagValue
  };
}

const reviewFlagRank = {
  self_service: 0,
  manual_review: 1,
  contact_soon: 2,
  complex_high_risk: 3
} as const;

function canonicalizeList(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase()));
}

export function applyReviewFlagPolicy(
  intake: IntakeInput,
  analysis: ModelAnalysis
): ModelAnalysis {
  const obstacles = canonicalizeList(intake.obstacles);
  const hasInstallment = intake.paymentMethod === "installment";
  const highAmount = intake.amount >= 10000;
  const midAmount = intake.amount >= 5000;
  const stalled = intake.stage === "deadlock";
  const platformEscalated = intake.stage === "platform";
  const missingEvidence =
    obstacles.has("missingevidence") || obstacles.has("missing_evidence");
  const platformRejected =
    obstacles.has("platformrejected") || obstacles.has("platform_rejected");
  const merchantOffline =
    obstacles.has("merchantoffline") || obstacles.has("merchant_offline");
  const manyRisks = analysis.adverse_factors.length >= 4;

  let targetFlag: ModelAnalysis["review_flag"] = analysis.review_flag;

  if (
    (hasInstallment && highAmount && stalled) ||
    (platformRejected && missingEvidence) ||
    manyRisks
  ) {
    targetFlag = "complex_high_risk";
  } else if (
    (hasInstallment && (midAmount || stalled)) ||
    platformRejected ||
    merchantOffline ||
    (highAmount && stalled)
  ) {
    targetFlag = "contact_soon";
  } else if (missingEvidence || stalled || platformEscalated || highAmount) {
    targetFlag = "manual_review";
  }

  if (reviewFlagRank[targetFlag] <= reviewFlagRank[analysis.review_flag]) {
    return analysis;
  }

  return { ...analysis, review_flag: targetFlag };
}

function attachProbability(
  intake: IntakeInput,
  analysis: ModelAnalysis
): AnalysisOutput {
  const reviewed = applyReviewFlagPolicy(intake, analysis);
  return {
    ...reviewed,
    probability: calculateProbabilityAssessment(intake, {
      favorableCount: reviewed.favorable_factors.length,
      adverseCount: reviewed.adverse_factors.length,
      decisiveIssueCount: reviewed.decisive_issues.length
    })
  };
}

function buildFallbackAnalysis(intake: IntakeInput): AnalysisOutput {
  const scenario = getScenarioLabel(intake.scenario);
  const goal = getGoalLabel(intake.goal);
  const stage = getStageLabel(intake.stage);
  const amount = new Intl.NumberFormat("zh-CN").format(intake.amount);
  const evidence = new Set(intake.evidence);
  const favorableFactors = [
    evidence.has("payment")
      ? "已提供付款记录，可用于确认交易金额和付款事实"
      : "已填写交易金额和付款时间，可作为后续核对起点",
    evidence.has("chat")
      ? "已保留沟通记录，可用于核对商家承诺和处理态度"
      : "已说明争议经过，可据此定位需要补充的沟通材料"
  ];

  return attachProbability(intake, {
    summary: `这起${scenario}涉及¥${amount}，当前已处于“${stage}”。争议需要围绕现有承诺、实际履行情况和“${goal}”目标逐项核对，材料完整度会直接影响后续处理空间。`,
    favorable_factors: favorableFactors,
    adverse_factors: [
      intake.obstacles.length
        ? "当前填写的障碍会增加处理成本，需要先核实对应事实和材料"
        : "现有信息仍未覆盖全部合同条款和商家完整答复"
    ],
    decisive_issues: ["能否用合同、宣传或沟通记录证明商家承诺与实际履行存在差异"],
    strategy: `先按时间顺序固定付款、承诺和履行事实，再评估实现“${goal}”所需的处理路径。`,
    next_steps: [
      "整理付款记录、合同和聊天截图，并标注关键时间与承诺内容",
      "核对合同中的退款、解除和扣费条款是否与销售承诺一致",
      "根据证据完整度形成正式沟通与后续处理方案"
    ],
    public_stage_titles: ["核对合同与承诺材料", "评估后续处理路径"],
    materials: ["合同或订单条款、付款凭证、关键承诺截图及商家最新书面回复"],
    communication:
      "请贵方就本次交易的履行情况、退款依据及费用计算方式作出书面说明，并对已提出的处理诉求在合理期限内明确回复。",
    review_flag: "manual_review"
  });
}

export async function analyzeIntake(intake: IntakeInput): Promise<AnalysisOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return buildFallbackAnalysis(intake);

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_API_BASE_URL ?? "https://api.deepseek.com"
    });
    const completion = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: "你是一名消费纠纷预审顾问。只输出合法 JSON，不要输出代码块。"
        },
        { role: "user", content: buildAnalysisPrompt(intake) }
      ],
      stream: false
    });
    const content = completion.choices[0]?.message?.content ?? "";
    const parsedJson = JSON.parse(extractJsonObject(content || "{}"));
    const parsed = modelAnalysisSchema.safeParse(normalizeAnalysisShape(parsedJson));

    if (!parsed.success) {
      console.error("DeepSeek analysis response did not match the required structure");
      return buildFallbackAnalysis(intake);
    }

    return attachProbability(intake, parsed.data);
  } catch {
    return buildFallbackAnalysis(intake);
  }
}

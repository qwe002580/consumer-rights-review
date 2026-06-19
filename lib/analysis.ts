import OpenAI from "openai";
import {
  analysisOutputSchema,
  getGoalLabel,
  getScenarioLabel,
  getStageLabel,
  type AnalysisOutput,
  type IntakeInput
} from "./schema";
import { buildAnalysisPrompt } from "./prompt";

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return withoutFence;
}

function normalizeAnalysisShape(raw: unknown) {
  if (!raw || typeof raw !== "object") return raw;

  const candidate = raw as Record<string, unknown>;
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
    basis: Array.isArray(candidate.basis)
      ? candidate.basis
      : Array.isArray(candidate.advantages)
        ? candidate.advantages
        : candidate.basis
          ? [candidate.basis]
          : [],
    risks: Array.isArray(candidate.risks)
      ? candidate.risks
      : Array.isArray(candidate.risk_points)
        ? candidate.risk_points
        : candidate.risks
          ? [candidate.risks]
          : [],
    next_steps: Array.isArray(candidate.next_steps)
      ? candidate.next_steps
      : Array.isArray(candidate.nextSteps)
        ? candidate.nextSteps
        : candidate.next_steps
          ? [candidate.next_steps]
          : [],
    materials: Array.isArray(candidate.materials)
      ? candidate.materials
      : Array.isArray(candidate.supporting_materials)
        ? candidate.supporting_materials
        : candidate.materials
          ? [candidate.materials]
          : [],
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
  analysis: AnalysisOutput
): AnalysisOutput {
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
  const manyRisks = analysis.risks.length >= 4;

  let targetFlag: AnalysisOutput["review_flag"] = analysis.review_flag;

  if ((hasInstallment && highAmount && stalled) || (platformRejected && missingEvidence) || manyRisks) {
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

  return {
    ...analysis,
    review_flag: targetFlag
  };
}

function buildFallbackAnalysis(intake: IntakeInput): AnalysisOutput {
  const scenarioLabel = getScenarioLabel(intake.scenario);
  const goalLabel = getGoalLabel(intake.goal);
  const stageLabel = getStageLabel(intake.stage);

  return applyReviewFlagPolicy(intake, {
    summary: `从现有信息看，这起${scenarioLabel}已具备基础评估条件。现阶段更适合围绕“${goalLabel}”先统一事实说明、证据目录和后续沟通口径，再决定是否继续升级处理。`,
    basis: [
      `已提交${scenarioLabel}所需的基础案件信息，当前处理进度为“${stageLabel}”。`
    ],
    risks: ["当前真实模型分析尚未启用，建议人工复核本次自动结果后再对外使用。"],
    next_steps: [
      `先根据现有信息梳理一份围绕“${goalLabel}”的简短经过说明。`,
      "补齐最核心的付款、聊天和合同材料，再重新发起分析。"
    ],
    materials: ["补充最核心的付款记录、聊天记录或合同材料。"],
    communication:
      "请贵方就本次争议在合理期限内书面回复处理意见。我方将根据现有付款、沟通及相关材料继续整理事实说明，并保留后续补充提交材料的权利。",
    review_flag: "manual_review"
  });
}

export async function analyzeIntake(intake: IntakeInput): Promise<AnalysisOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return buildFallbackAnalysis(intake);
  }

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
          content:
            "你是一名专业、克制的消费纠纷预审顾问。输出必须是合法 JSON，不要输出代码块。"
        },
        {
          role: "user",
          content: buildAnalysisPrompt(intake)
        }
      ],
      stream: false
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsedJson = JSON.parse(extractJsonObject(content || "{}"));
    const normalized = normalizeAnalysisShape(parsedJson);
    const parsed = analysisOutputSchema.safeParse(normalized);

    if (!parsed.success) {
      console.error("DeepSeek analysis parse failed", {
        content,
        parsedJson,
        normalized,
        issues: parsed.error.issues
      });
      return buildFallbackAnalysis(intake);
    }

    return applyReviewFlagPolicy(intake, parsed.data);
  } catch (_error) {
    return buildFallbackAnalysis(intake);
  }
}

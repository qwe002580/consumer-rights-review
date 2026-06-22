import { afterEach, describe, expect, it, vi } from "vitest";
import { modelAnalysisSchema, type ModelAnalysis } from "../lib/schema";

const intake = {
  clientName: "王女士",
  contact: "wx-private-contact",
  scenario: "education",
  amount: 12800,
  purchaseDate: "2026-05-28",
  paymentMethod: "installment",
  stage: "deadlock",
  issues: ["misrepresentation"],
  evidence: ["payment", "chat"],
  obstacles: ["missingEvidence"],
  goal: "fullRefund",
  summary: "商家拒绝退款"
};

const modelAnalysis = (
  overrides: Partial<ModelAnalysis> = {}
): ModelAnalysis => ({
  summary: "本案涉及12,800元教培分期，争议集中在宣传承诺与实际服务不一致。",
  favorable_factors: ["付款记录和沟通记录能够对应交易事实"],
  adverse_factors: ["关键宣传页面尚未完整保存"],
  decisive_issues: ["能否证明报名时的具体退款承诺"],
  strategy: "先固定宣传承诺与实际履行差异，再确定协商和投诉顺序。",
  next_steps: [
    "整理付款、合同和承诺截图并按时间排序",
    "核对合同退款条款",
    "形成正式沟通方案"
  ],
  public_stage_titles: ["核对合同和承诺材料", "评估后续处理路径"],
  materials: ["报名页面及退款承诺截图"],
  communication: "完整内部沟通建议",
  review_flag: "contact_soon",
  ...overrides
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("professional analysis", () => {
  it("accepts the case-specific model response structure", () => {
    const parsed = modelAnalysisSchema.parse(modelAnalysis());

    expect(parsed.decisive_issues).toHaveLength(1);
    expect(parsed.public_stage_titles).toHaveLength(2);
  });

  it("formats intake into a specific prompt without private contact data", async () => {
    const { buildAnalysisPrompt } = await import("../lib/prompt");
    const prompt = buildAnalysisPrompt(intake);

    expect(prompt).toContain("12,800");
    expect(prompt).toContain("教培退费");
    expect(prompt).toContain("多轮沟通后仍无进展");
    expect(prompt).toContain("不得输出成功概率");
    expect(prompt).toContain("禁止使用固定开头");
    expect(prompt).toContain("favorable_factors");
    expect(prompt).toContain("decisive_issues");
    expect(prompt).toContain("public_stage_titles");
    expect(prompt).not.toContain("wx-private-contact");
    expect(prompt).not.toContain("王女士");
  });

  it("exposes the intake form component module", async () => {
    const mod = await import("../components/intake-form");
    expect(typeof mod.IntakeForm).toBe("function");
  });

  it("returns a case-specific fallback with probability when no key is configured", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const { analyzeIntake } = await import("../lib/analysis");

    const result = await analyzeIntake(intake);

    expect(result.summary).toContain("教培退费");
    expect(result.summary).toContain("12,800");
    expect(result.summary).not.toMatch(/^从现有信息看/);
    expect(result.favorable_factors).toContain("已提供付款记录，可用于确认交易金额和付款事实");
    expect(result.communication).toContain("请贵方");
    expect(result.probability.full_success.max).toBeLessThanOrEqual(
      result.probability.substantive_result.max
    );
  });

  it("upgrades review flags for complex cases even if the model is conservative", async () => {
    const { applyReviewFlagPolicy } = await import("../lib/analysis");

    const upgraded = applyReviewFlagPolicy(
      {
        ...intake,
        obstacles: ["missingEvidence", "platformRejected"]
      },
      modelAnalysis({ review_flag: "self_service" })
    );

    expect(upgraded.review_flag).toBe("complex_high_risk");
  });

  it("preserves stronger model flags when already escalated", async () => {
    const { applyReviewFlagPolicy } = await import("../lib/analysis");

    const result = applyReviewFlagPolicy(
      {
        ...intake,
        amount: 3000,
        paymentMethod: "full",
        stage: "negotiating",
        obstacles: []
      },
      modelAnalysis({ review_flag: "contact_soon" })
    );

    expect(result.review_flag).toBe("contact_soon");
  });
});
